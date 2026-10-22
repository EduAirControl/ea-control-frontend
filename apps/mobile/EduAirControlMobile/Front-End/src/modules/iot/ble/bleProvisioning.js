import { PermissionsAndroid, Platform } from 'react-native'
import { BleManager } from 'react-native-ble-plx'
import Base64 from 'react-native-base64'

// UUIDs del firmware ESP32 (ver guia_configuracion_esp32_react_native_ble.md)
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
export const PROVISIONING_DEVICE_NAME = 'ESP32_Config'

let manager = null

export function getBleManager() {
  if (!manager) manager = new BleManager()
  return manager
}

export function destroyBleManager() {
  if (manager) {
    manager.destroy()
    manager = null
  }
}

/**
 * Tiempo maximo que se espera al dialogo de permisos.
 *
 * En un build sin los permisos BLE declarados (por ejemplo Expo Go) la peticion
 * nativa no llega a resolver nunca: sin este limite la pantalla se queda en
 * "escaneando" para siempre y no se ve que ha fallado.
 */
const PERMISSION_TIMEOUT_MS = 5000

export async function ensureBlePermissions() {
  if (Platform.OS !== 'android') return true

  const ask = async () => {
    if (Platform.Version >= 31) {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ])
      return Object.values(grants).every(
        (value) => value === PermissionsAndroid.RESULTS.GRANTED
      )
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  }

  let granted
  try {
    granted = await Promise.race([
      ask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PERMISSION_TIMEOUT')), PERMISSION_TIMEOUT_MS)
      ),
    ])
  } catch (e) {
    throw new Error(e?.message === 'PERMISSION_TIMEOUT' ? 'PERMISSION_TIMEOUT' : 'PERMISSION_DENIED')
  }

  if (!granted) throw new Error('PERMISSION_DENIED')
  return true
}

/**
 * ¿Es el nodo que buscamos?
 *
 * El nombre es la señal fuerte. Android puede entregar `name`/`localName` en
 * null (paquete de nombre en el scan response, o nombre retirado por el sistema
 * en escaneos sin filtro), asi que el service UUID es el respaldo: es nuestro y
 * no lo comparte nadie.
 */
function isProvisioningDevice(device) {
  const name = String(device?.name || device?.localName || '').trim()
  if (name.toUpperCase() === PROVISIONING_DEVICE_NAME.toUpperCase()) return true
  const services = device?.serviceUUIDs || []
  return services.some((u) => String(u).toLowerCase() === SERVICE_UUID.toLowerCase())
}

/**
 * Escanea, conecta con el primer ESP32_Config y descubre sus servicios.
 *
 * Se escanea CON el service UUID como filtro de sistema. Con el permiso
 * `neverForLocation` (plugin react-native-ble-plx) Android 12+ retira el
 * nombre y los service UUIDs de los resultados de escaneo sin filtro: sin este
 * filtro la app "no ve" el nodo aunque los Ajustes del telefono si lo muestren.
 * El filtro ademas ignora el resto de perifericos cercanos.
 *
 * @throws Error('BLE_UNAVAILABLE') si el modulo nativo no esta (Expo Go)
 * @throws Error('PERMISSION_DENIED') / Error('PERMISSION_TIMEOUT')
 * @throws Error('SCAN_TIMEOUT') si no aparece ningun nodo
 */
export function scanAndConnect({ onStatus, timeoutMs = 20000 } = {}) {
  let ble
  try {
    ble = getBleManager()
  } catch {
    return Promise.reject(new Error('BLE_UNAVAILABLE'))
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let timeout = null

    const finish = (fn, arg) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      try {
        ble.stopDeviceScan()
      } catch {
        // el escaneo ya estaba detenido
      }
      fn(arg)
    }

    onStatus?.('scanning')

    timeout = setTimeout(() => {
      finish(reject, new Error('SCAN_TIMEOUT'))
    }, timeoutMs)

    ble.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (error) {
        finish(reject, error)
        return
      }
      if (!isProvisioningDevice(device)) return

      try {
        ble.stopDeviceScan()
        onStatus?.('connecting')
        const connected = await device.connect()
        // El payload de provisioning (SSID + pass + JWT de ~600 chars +
        // installationId) son ~800 bytes: con el MTU por defecto de 23 el
        // "long write" de Android lo fragmenta en ~40 prepares y el Bluedroid
        // del ESP32 lo rechaza (el nodo no recibe nada). Con MTU 512 caben dos
        // paquetes y el write llega entero.
        try {
          await connected.requestMtu(512)
        } catch {
          // Si el SO no permite negociar MTU se sigue con el default.
        }
        await connected.discoverAllServicesAndCharacteristics()
        finish(resolve, connected)
      } catch (e) {
        finish(reject, e)
      }
    })
  })
}

/** Suscribe las notificaciones de estado (STATUS:CONNECTED | STATUS:FAIL | STATUS:ERR_JSON). */
export function subscribeStatus(device, onMessage, onError) {
  return device.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (error) {
        onError?.(error)
        return
      }
      if (!characteristic?.value) return
      try {
        onMessage?.(Base64.decode(characteristic.value))
      } catch (e) {
        onError?.(e)
      }
    }
  )
}

/**
 * Envía la configuración del nodo en JSON plano, troceada.
 *
 * El payload (SSID + pass + JWT de ~600 chars + installationId) son ~800
 * bytes: con el MTU por defecto (o incluso con 512 si la negociacion falla)
 * el "long write" de Android al Bluedroid del ESP32 falla en la practica y
 * el nodo no recibe nada. Se escriben trozos seguros bajo el MTU negociado;
 * el firmware los acumula (IncompleteInput) y parsea el JSON completo al
 * final.
 */
export async function sendCredentials(device, ssid, password, token, installationId) {
  const payload = JSON.stringify({
    ssid,
    pass: password || '',
    token: token || '',
    installationId: installationId || '',
  })
  // Largo util = MTU - 3 (ATT). Se resta margen extra por si el stack anade
  // cabeceras; y se limita a 400 para no hacer writes gigantes si el MTU es
  // muy grande. Minimo 20 (el ATT por defecto de 23).
  const mtu = Number(device?.mtu) || 23
  const chunkSize = Math.max(20, Math.min(400, mtu - 8))
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Base64.encode(chunk)
    )
  }
}

export async function disconnect(device) {
  if (!device) return
  try {
    await device.cancelConnection()
  } catch {
    // ya desconectado
  }
}

/** Traduce errores frecuentes de react-native-ble-plx a claves i18n (devices.errors.*). */
export function toBleErrorKey(error) {
  const name = error?.name || error?.code || ''
  const message = String(error?.message || '')

  if (name === 'LocationServicesDisabled' || message.includes('Location services')) return 'devices.errors.location'
  if (name === 'BluetoothUnauthorized' || message.includes('unauthorized')) return 'devices.errors.unauthorized'
  if (name === 'BluetoothPoweredOff' || message.includes('Bluetooth is powered off')) return 'devices.errors.poweredOff'
  // Sin modulo nativo (Expo Go): no hay forma de escanear.
  if (message === 'BLE_UNAVAILABLE' || name === 'BleModuleNotFound') return 'devices.errors.bleUnavailable'
  // El dialogo de permisos no llego a responderse.
  if (message === 'PERMISSION_TIMEOUT') return 'devices.errors.permissionTimeout'
  if (message === 'SCAN_TIMEOUT' || name === 'SCAN_TIMEOUT') return 'devices.errors.notFound'
  if (message === 'PERMISSION_DENIED') return 'devices.errors.permission'
  return 'devices.errors.generic'
}
