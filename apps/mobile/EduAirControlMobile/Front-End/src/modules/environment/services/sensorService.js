import apiClient from '../../../shared/services/apiClient'

/**
 * Sensores, instalaciones y variables (ms-sensor-management).
 *
 * <p>El contrato real es `{serialNumber, sensorModelId, sensorStatusId}` para el
 * alta y `{sensorId, educationalEnvironmentId, installedAt}` para la instalación.
 * Antes se mandaba `{environmentId, variable, min, max}` y se llamaba a
 * `POST /sensors/{id}/toggle`, que no existe: todo el módulo devolvía 404.
 *
 * <p><b>Los umbrales min/max no viven aquí</b> (ADR-014): pertenecen a
 * ms-environment-monitoring. Se conservan en la forma de la UI y se ignoran al
 * crear, para no inventar campos que el backend rechaza.
 */
const BASE = '/api/v1/sensors'
const INSTALLATIONS = '/api/v1/sensor-installations'
const VARIABLES = '/api/v1/variables'
const SENSOR_VARIABLES = '/api/v1/sensor-variables'

export const VARIABLE_META = {
  temperature: { unit: '°C', icon: 'thermometer-outline', tone: 'mint', defaultMin: 18, defaultMax: 28, labelKey: 'sensors.varTemperature' },
  humidity: { unit: '%', icon: 'water-outline', tone: 'blue', defaultMin: 35, defaultMax: 65, labelKey: 'sensors.varHumidity' },
  co2: { unit: 'ppm', icon: 'cloud-outline', tone: 'amber', defaultMin: 400, defaultMax: 1000, labelKey: 'sensors.varCo2' },
  noise: { unit: 'dB', icon: 'volume-high-outline', tone: 'purple', defaultMin: 30, defaultMax: 65, labelKey: 'sensors.varNoise' },
}

export const TONE_COLORS = {
  mint: '#01805b',
  blue: '#2563eb',
  amber: '#d97706',
  purple: '#7c3aed',
}

/** Campo de métrica del ambiente que lee cada variable del sensor. */
export const ENV_FIELD_BY_VARIABLE = {
  temperature: 'temp',
  humidity: 'humidity',
  co2: 'co2',
  noise: 'noise',
}

/**
 * Credencial del dispositivo: la emite ms-security y el ESP32 la usa como
 * `Authorization: Bearer` al enviar mediciones.
 */
const DEVICE_TOKENS = '/api/v1/device-tokens'
const SENSOR_MODELS = '/api/v1/sensor-models'
const SENSOR_STATUSES = '/api/v1/sensor-statuses'
const MEASUREMENT_UNITS = '/api/v1/measurement-units'

function toUi(sensor) {
  if (!sensor) return sensor
  // ms-sensor-management expone `sensorId`; el flujo de aprovisionamiento
  // necesita una clave `id` normalizada para instalar el sensor y pedir token.
  const id = sensor.sensorId ?? sensor.id
  return {
    ...sensor,
    id,
    sensorId: id,
    type: sensor.variable || sensor.variableCode || 'temperature',
    environmentId: sensor.educationalEnvironmentId,
    min: sensor.min,
    max: sensor.max,
  }
}

function toList(data) {
  if (Array.isArray(data)) return data
  return data?.data || data?.items || []
}

function sensorPath(id) {
  return `${BASE}/${encodeURIComponent(id)}`
}

const sensorService = {
  /** Sensores del catálogo (el backend no filtra por ambiente: hazlo vía instalaciones). */
  async getAll() {
    const data = await apiClient.get(BASE, { params: { limit: 100 } })
    return toList(data).map(toUi)
  },

  async getById(id) {
    return toUi(await apiClient.get(sensorPath(id)))
  },

  async create(data) {
    const serial = String(data.sensorId || data.serialNumber || '').trim().toUpperCase()
    const { sensorModelId, sensorStatusId } = data
    if (!sensorModelId || !sensorStatusId) {
      throw new Error('Faltan sensorModelId/sensorStatusId: elige un modelo y un estado del catálogo')
    }
    return toUi(await apiClient.post(BASE, { serialNumber: serial, sensorModelId, sensorStatusId }))
  },

  // --- catálogos (ms-sensor-management) ---

  async listModels() {
    return toList(await apiClient.get(SENSOR_MODELS, { params: { limit: 100 } }))
  },

  async listStatuses() {
    return toList(await apiClient.get(SENSOR_STATUSES, { params: { limit: 100 } }))
  },

  async listUnits() {
    return toList(await apiClient.get(MEASUREMENT_UNITS, { params: { limit: 100 } }))
  },

  /**
   * Pide la credencial de ingesta del sensor. El `subject` del token es el
   * propio sensorId: el ESP32 solo puede enviar medidas, no hacer nada mas.
   */
  async requestDeviceToken(sensorId) {
    return apiClient.post(DEVICE_TOKENS, { subject: sensorId })
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(sensorPath(id), updates))
  },

  async remove(id) {
    return apiClient.delete(sensorPath(id))
  },

  /** Instalación de un sensor en un ambiente. */
  install(sensorId, educationalEnvironmentId, installedAt) {
    return apiClient.post(INSTALLATIONS, {
      sensorId,
      educationalEnvironmentId,
      installedAt: installedAt || new Date().toISOString(),
    })
  },

  /** Cierre de instalación (baja lógica, sin borrado físico). */
  removeInstallation(installationId) {
    return apiClient.post(`${INSTALLATIONS}/${encodeURIComponent(installationId)}/remove`)
  },

  /**
   * Instalaciones de un sensor. `active: true` pide solo las abiertas
   * (`removedAt IS NULL`), que es lo que necesita el aprovisionamiento para
   * decidir si reutiliza o reinstala.
   */
  async listInstallations(sensorId, { active } = {}) {
    return toList(await apiClient.get(INSTALLATIONS, { params: { limit: 100, sensorId, active } }))
  },

  /** Instalaciones abiertas de un ambiente (dispositivos vinculados). */
  async listInstallationsByEnvironment(educationalEnvironmentId, { active = true } = {}) {
    return toList(
      await apiClient.get(INSTALLATIONS, {
        params: { limit: 100, educationalEnvironmentId, active },
      })
    )
  },

  /**
   * Serial exacto. `GET /sensors?q=` es búsqueda parcial, así que se filtra en
   * cliente: hace falta al recuperar un sensor que ya existía (409 en el alta).
   */
  async findBySerial(serial) {
    const wanted = String(serial || '').trim().toUpperCase()
    if (!wanted) return null
    const rows = toList(await apiClient.get(BASE, { params: { q: wanted, limit: 100 } }))
    return rows.map(toUi).find((s) => String(s.serialNumber || s.sensorId).toUpperCase() === wanted) || null
  },

  async listVariables() {
    return toList(await apiClient.get(VARIABLES, { params: { limit: 100 } }))
  },

  createVariable(variable) {
    return apiClient.post(VARIABLES, variable)
  },

  async listSensorVariables(sensorId) {
    return toList(await apiClient.get(SENSOR_VARIABLES, { params: { limit: 100, sensorId } }))
  },

  createSensorVariable(sensorId, variableId) {
    return apiClient.post(SENSOR_VARIABLES, { sensorId, variableId })
  },
}

export default sensorService
