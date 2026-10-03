import apiClient from '../../../shared/services/apiClient'

const BASE = '/api/v1/sensors'

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
 * El backend expone `variable` y `id` (número de serie); la UI usa `type` y
 * `sensorId` para mostrar/editar el sensor.
 */
function toUi(row) {
  if (!row) return row
  return { ...row, type: row.variable, sensorId: row.id }
}

function toList(data) {
  return Array.isArray(data) ? data : data?.items || []
}

function path(serial) {
  return `${BASE}/${encodeURIComponent(serial)}`
}

const sensorService = {
  async getAll(environmentId) {
    const query = environmentId ? `?environmentId=${encodeURIComponent(environmentId)}` : ''
    return toList(await apiClient.get(`${BASE}${query}`)).map(toUi)
  },

  async getByEnvironment(environmentId) {
    return this.getAll(environmentId)
  },

  async create(data) {
    const meta = VARIABLE_META[data.type] || {}
    const serial = String(data.sensorId || '').trim().toUpperCase()
    return toUi(
      await apiClient.post(BASE, {
        environmentId: data.environmentId,
        variable: data.type,
        min: data.min ?? meta.defaultMin ?? 0,
        max: data.max ?? meta.defaultMax ?? 100,
        id: serial || undefined,
      })
    )
  },

  /** `sensor` es la fila completa (la edición solo cambia tipo/min/max). */
  async update(sensor) {
    return toUi(
      await apiClient.patch(path(sensor.id), {
        environmentId: sensor.environmentId,
        variable: sensor.type,
        min: Number(sensor.min),
        max: Number(sensor.max),
        // El backend interpreta `status` como instalación: conservarla.
        status: sensor.installed ? 'active' : 'offline',
        id: sensor.id,
      })
    )
  },

  async delete(serial) {
    return apiClient.delete(path(serial))
  },

  /** Alterna la instalación del sensor (activo / dado de baja). */
  async toggleStatus(sensor) {
    await apiClient.post(`${path(sensor.id)}/toggle`, {})
    return !sensor.installed
  },
}

export default sensorService
