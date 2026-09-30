import { dbClient } from '../../../shared/services/apiClient'

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

const sensorService = {
  async getAll() {
    return dbClient.get('/sensors')
  },

  async create(data) {
    const meta = VARIABLE_META[data.type] || {}
    return dbClient.post('/sensors', {
      sensorId: data.sensorId,
      type: data.type,
      environmentId: Number(data.environmentId),
      active: true,
      status: 'active',
      lastSync: '',
      min: data.min ?? meta.defaultMin ?? 0,
      max: data.max ?? meta.defaultMax ?? 100,
    })
  },

  async update(id, updates) {
    return dbClient.patch(`/sensors/${id}`, updates)
  },

  async toggleStatus(sensor) {
    const next = sensor.status === 'offline' ? 'active' : 'offline'
    await dbClient.patch(`/sensors/${sensor.id}`, { status: next, active: next !== 'offline' })
    return next
  },
}

export default sensorService
