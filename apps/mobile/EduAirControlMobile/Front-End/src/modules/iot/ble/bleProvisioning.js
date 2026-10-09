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
 * Escanea filtrando por SERVICE_UUID, conecta al primer ESP32_Config
 * y descubre servicios/características. Devuelve el dispositivo conectado.
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

    onStatus?.('scanning')

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
        onStatus?.('connecting')
        const connected = await device.connect()
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

/** Envía {ssid, pass} codificado en Base64 a la característica de aprovisionamiento. */
export async function sendCredentials(device, ssid, password) {
  const payload = Base64.encode(JSON.stringify({ ssid, pass: password || '' }))
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

/** Traduce errores frecuentes de react-native-ble-plx a claves i18n (devices.errors.*). */
export function toBleErrorKey(error) {
  const name = error?.name || error?.code || ''
  const message = String(error?.message || '')

  if (name === 'LocationServicesDisabled' || message.includes('Location services')) return 'devices.errors.location'
  if (name === 'BluetoothUnauthorized' || message.includes('unauthorized')) return 'devices.errors.unauthorized'
  if (name === 'BluetoothPoweredOff' || message.includes('Bluetooth is powered off')) return 'devices.errors.poweredOff'
  if (message === 'SCAN_TIMEOUT' || name === 'SCAN_TIMEOUT') return 'devices.errors.notFound'
  if (message === 'PERMISSION_DENIED') return 'devices.errors.permission'
  return 'devices.errors.generic'
}
