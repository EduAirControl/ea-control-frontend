import { PermissionsAndroid, Platform } from 'react-native'
import { BleManager } from 'react-native-ble-plx'
import Base64 from 'react-native-base64'

// Contrato con el firmware (ver infra/iot/esp32-node/src/main.cpp y
// guia_configuracion_esp32_react_native_ble.md). Los tres identificadores no se
// tocan sin cambiar los dos lados.
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
export const PROVISIONING_DEVICE_NAME = 'ESP32_Config'

/** MTU solicitado. El token viaja en el MISMO write que ssid/pass, asi que sin
 *  esto la carga no cabe en el ATT por defecto de 23 bytes. */
const REQUESTED_MTU = 247

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

export async function ensureBlePermissions() {
  if (Platform.OS !== 'android') return true

  if (Platform.Version >= 31) {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ])
    const granted = Object.values(grants).every(
      (value) => value === PermissionsAndroid.RESULTS.GRANTED
    )
    if (!granted) {
      throw new Error('PERMISSION_DENIED')
    }
    return true
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  )
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('PERMISSION_DENIED')
  }
  return true
}

/**
 * Escanea filtrando por SERVICE_UUID, conecta al primer ESP32_Config,
 * negocia MTU y descubre servicios/caracteristicas.
 */
export function scanAndConnect({ onStatus, timeoutMs = 20000 } = {}) {
  const ble = getBleManager()

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

    onStatus?.('connecting')

    timeout = setTimeout(() => {
      finish(reject, new Error('SCAN_TIMEOUT'))
    }, timeoutMs)

    ble.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (error) {
        finish(reject, error)
        return
      }
      if (!device || device.name !== PROVISIONING_DEVICE_NAME) return

      try {
        ble.stopDeviceScan()
        const connected = await device.connect()

        // requestMTU es best-effort: si el movil lo rechaza se sigue con el MTU
        // por defecto, que es lo que pasaba antes de este cambio.
        try {
          await connected.requestMTU(REQUESTED_MTU)
        } catch (error) {
          onStatus?.('mtu-fallback')
        }

        await connected.discoverAllServicesAndCharacteristics()
        finish(resolve, connected)
      } catch (e) {
        finish(reject, e)
      }
    })
  })
}

/**
 * Lee la MAC real del firmware.
 *
 * En Android device.id ya es la MAC, pero en iOS react-native-ble-plx devuelve un
 * UUID periferico y el backend valida el patron AA:BB:CC:DD:EE:FF, asi que el
 * registro fallaba con 400. El firmware expone la MAC por READ y esto lo evita.
 *
 * @returns {Promise<string|null>} MAC en mayusculas, o null si el firmware es
 *          antiguo y no responde.
 */
export async function readDeviceMac(device) {
  try {
    const characteristic = await device.readCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID
    )
    if (!characteristic?.value) return null
    const text = Base64.decode(characteristic.value).trim()
    return /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(text) ? text.toUpperCase() : null
  } catch {
    // Firmware previo: no implementa READ de MAC.
    return null
  }
}

/** Suscribe las notificaciones de estado. */
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
 * Envia al ESP32 {ssid, pass, token} en Base64, en una sola escritura.
 *
 * El token es lo que permite que el firmware se autoconfigure por HTTPS sin que
 * haya que recompilarlo con las URLs y el secreto de cada aula. Los tres campos
 * van juntos precisamente para que el BLE siga siendo una carga corta.
 */
export async function sendCredentials(device, { ssid, password, token }) {
  const payload = Base64.encode(JSON.stringify({ ssid, pass: password || '', token }))
  await device.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    payload
  )
}

export async function disconnect(device) {
  if (!device) return
  try {
    await device.cancelConnection()
  } catch {
    // ya desconectado
  }
}

/** Traduce errores de react-native-ble-plx a claves i18n (devices.errors.*). */
export function toBleErrorKey(error) {
  const name = error?.name || error?.code || ''
  const message = String(error?.message || '')

  if (name === 'LocationServicesDisabled' || message.includes('Location services')) return 'devices.errors.location'
  if (name === 'BluetoothUnauthorized' || message.includes('unauthorized')) return 'devices.errors.unauthorized'
  if (name === 'BluetoothPoweredOff' || message.includes('Bluetooth is powered off')) return 'devices.errors.poweredOff'
  if (message === 'SCAN_TIMEOUT' || name === 'SCAN_TIMEOUT') return 'devices.errors.notFound'
  if (message === 'PERMISSION_DENIED' || name === 'PERMISSION_DENIED') return 'devices.errors.permission'
  return 'devices.errors.generic'
}