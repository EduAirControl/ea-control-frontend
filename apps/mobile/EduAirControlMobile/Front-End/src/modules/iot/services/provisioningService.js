/**
 * Orquestacion del aprovisionamiento de un nodo ESP32 desde el movil.
 *
 * El objetivo es que la puesta en marcha no requiera recompilar el firmware: el
 * backend es la fuente de verdad y el token viaja al ESP32 por BLE.
 *
 * Secuencia (ver ms-security DeviceProvisioningController):
 *
 *   1. GET  /api/v1/sensors                     -> sensorId -> serialNumber
 *   2. GET  /api/v1/sensor-installations?...     -> sensorInstallationId por ambiente
 *   3. POST /api/v1/devices                      -> deviceId        (ms-sensor-management)
 *   4. POST /api/v1/auth/device/provision-tokens -> token           (ms-security)
 *   5. BLE: { ssid, pass, token }                -> ESP32
 *
 * Los pasos 1 y 2 son dos llamadas porque sensor-installation no expone el
 * serial: es el unico dato que liga una instalacion con su variable.
 */

import apiClient from '../../../shared/services/apiClient'
import deviceService from './deviceService'

/**
 * UUIDs canonicos de environment_monitoring.variable (sembrados por
 * ms-environment-monitoring/changes/010-seed-reference.yaml). NO son los de
 * ms-sensor-management: sensors.variable usa gen_random_uuid() y son otros UUID.
 */
export const CANONICAL_VARIABLE_IDS = {
  temperature: '00000000-0000-4000-8000-000000000071',
  humidity: '00000000-0000-4000-8000-000000000072',
  co2: '00000000-0000-4000-8000-000000000073',
  noise: '00000000-0000-4000-8000-000000000074',
}

/**
 * Sufijo del serial -> variable. El seed crea los seriales como
 * 'EA-' + ambiente + '-' + inicial (101-seed-dev-sensors.sql), y la inicial es
 * la unica pista disponible.
 */
const SERIAL_SUFFIX_TO_CODE = { T: 'temperature', H: 'humidity', C: 'co2', N: 'noise' }

function codeFromSerial(serialNumber) {
  if (!serialNumber) return null
  const suffix = String(serialNumber).trim().toUpperCase().split('-').pop()
  return SERIAL_SUFFIX_TO_CODE[suffix] || null
}

/**
 * Empareja las instalaciones activas de un ambiente con las variables canonicas.
 *
 * @returns {{bindings: Array, skipped: Array<{serialNumber: string}>}}
 */
export async function resolveBindings(educationalEnvironmentId) {
  if (!educationalEnvironmentId) {
    throw new Error('devices.errors.noEnvironment')
  }

  const [sensorsRes, installationsRes] = await Promise.all([
    apiClient.get('/api/v1/sensors?page=1&limit=100'),
    apiClient.get(
      `/api/v1/sensor-installations?educationalEnvironmentId=${encodeURIComponent(
        educationalEnvironmentId
      )}&active=true&page=1&limit=100`
    ),
  ])

  const sensors = Array.isArray(sensorsRes) ? sensorsRes : sensorsRes?.data || []
  const installations = Array.isArray(installationsRes) ? installationsRes : installationsRes?.data || []

  const serialBySensorId = new Map()
  for (const sensor of sensors) {
    if (sensor.sensorId) serialBySensorId.set(sensor.sensorId, sensor.serialNumber)
  }

  const bindings = []
  const skipped = []
  const seen = new Set()

  for (const installation of installations) {
    const serialNumber = serialBySensorId.get(installation.sensorId)
    const code = codeFromSerial(serialNumber)
    if (!code) {
      skipped.push({ serialNumber: serialNumber || installation.sensorId })
      continue
    }
    // Una instalacion por variable: environment_measurement distingue por
    // (sensor_installation_id, variable_id) y dos sensores de la misma variable
    // solo duplicarian filas.
    if (seen.has(code)) continue
    seen.add(code)

    bindings.push({
      variableId: CANONICAL_VARIABLE_IDS[code],
      sensorInstallationId: installation.sensorInstallationId,
      code,
    })
  }

  return { bindings, skipped }
}

/**
 * Prepara el token de aprovisionamiento: registra el dispositivo (o reutiliza el
 * existente) y pide el token a ms-security.
 *
 * @returns {{deviceId: string, token: string, clientId: string, expiresAt: string}}
 */
export async function prepareProvisionToken({ macAddress, name, educationalEnvironmentId }) {
  if (!macAddress || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(String(macAddress).toUpperCase())) {
    throw new Error('devices.errors.macFormat')
  }

  const { bindings, skipped } = await resolveBindings(educationalEnvironmentId)
  if (bindings.length === 0) {
    throw new Error('devices.errors.noInstallations')
  }

  // 409 = ya registrado. Es el caso normal al reprovisionar un nodo existente,
  // asi que se busca y se reutiliza en vez de fallar.
  let device
  try {
    device = await deviceService.create({
      macAddress,
      nombre: name || null,
      tipo: 'esp32',
      idAula: educationalEnvironmentId,
    })
  } catch (error) {
    // Se mira error.status y no el mensaje: "Ya existe un dispositivo con la MAC
    // ..." no dice 409, y una expresion sobre el texto seria fragil.
    if (error?.status !== 409) throw error
    const existing = await deviceService.getAll()
    device = existing.find((d) => d.macAddress === String(macAddress).toUpperCase())
    if (!device) throw error
    await deviceService.update(device.id, {
      nombre: name || device.nombre,
      idAula: educationalEnvironmentId,
    })
  }

  const issued = await apiClient.post('/api/v1/auth/device/provision-tokens', {
    deviceId: device.id,
    macAddress: String(macAddress).toUpperCase(),
    bindings: bindings.map((b) => ({
      variableId: b.variableId,
      sensorInstallationId: b.sensorInstallationId,
    })),
  })

  return {
    deviceId: device.id,
    device,
    token: issued.token,
    clientId: issued.clientId,
    expiresAt: issued.expiresAt,
    bindings,
    skipped,
  }
}

export default { resolveBindings, prepareProvisionToken, CANONICAL_VARIABLE_IDS }