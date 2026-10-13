import apiClient from '../../../shared/services/apiClient'
import { deriveStatusKey, mapMetricsByEnvironment } from '../utils/environmentMetrics.js'

/**
 * Ambientes educativos (ms-classroom-management), métricas actuales
 * (ms-environment-monitoring) y favoritos (ms-user-experience).
 *
 * <p>`getAll` mergea la lista de ambientes con la última medición por ambiente
 * (`/api/v1/environments/current`) y el nombre del campus (`/api/v1/campuses`)
 * para que el dashboard, el detalle y la gestión muestren datos reales.
 */
const BASE = '/api/v1/educational-environments'

function toUi(env, metrics, campusNameById) {
  if (!env) return env
  const id = env.educationalEnvironmentId ?? env.id
  return {
    // ms-classroom-management expone `educationalEnvironmentId`; varias
    // pantallas usan `id` como clave interna y para crear instalaciones BLE.
    id,
    code: env.code,
    name: env.name,
    floor: env.floor,
    capacity: env.occupancyCapacity,
    envType: env.environmentTypeId,
    campusId: env.campusId,
    status: env.status,
    isFavorite: Boolean(env.favorite),
    location: campusNameById?.[env.campusId] ?? env.location ?? '',
    temp: metrics?.temp,
    humidity: metrics?.humidity,
    co2: metrics?.co2,
    noise: metrics?.noise,
    measuredAt: metrics?.measuredAt,
    statusKey: deriveStatusKey(metrics),
  }
}

function toList(data) {
  if (Array.isArray(data)) return data
  return data?.data || data?.items || data?.content || []
}

function toPayload(environment) {
  const payload = {}
  if (environment.campusId) payload.campusId = environment.campusId
  if (environment.code) payload.code = environment.code
  if (environment.name) payload.name = environment.name
  if (environment.environmentTypeId || environment.envType) {
    payload.environmentTypeId = environment.environmentTypeId || environment.envType
  }
  if (environment.floor !== undefined && environment.floor !== null && environment.floor !== '') {
    payload.floor = Number(environment.floor)
  }
  if (environment.capacity !== undefined && environment.capacity !== null && environment.capacity !== '') {
    payload.occupancyCapacity = Number(environment.capacity)
  }
  if (environment.status) payload.status = environment.status
  return payload
}

const environmentService = {
  /** Lista de ambientes mergeada con métricas actuales y nombre de campus. */
  async getAll() {
    const [rows, metricRows, campuses] = await Promise.all([
      apiClient.get(BASE, { params: { page: 1, limit: 100 } }),
      apiClient.get('/api/v1/environments/current').catch(() => []),
      apiClient.get('/api/v1/campuses', { params: { limit: 100 } }).catch(() => ({ data: [] })),
    ])
    const metricsByEnv = mapMetricsByEnvironment(metricRows)
    const campusNameById = {}
    toList(campuses).forEach((campus) => {
      campusNameById[campus.campusId ?? campus.id] = campus.name
    })
    return toList(rows).map((env) => toUi(env, metricsByEnv[env.educationalEnvironmentId ?? env.id], campusNameById))
  },

  async getById(id) {
    return toUi(await apiClient.get(`${BASE}/${id}`))
  },

  /** Última medición por (ambiente, variable) de todos los ambientes. */
  async getMetrics() {
    const rows = await apiClient.get('/api/v1/environments/current')
    return Array.isArray(rows) ? rows : []
  },

  /** Ids de ambientes marcados como favoritos (ms-user-experience). */
  async getFavoriteIds() {
    const ids = await apiClient.get('/api/v1/favorites')
    return Array.isArray(ids) ? ids : []
  },

  async getCampuses() {
    return toList(await apiClient.get('/api/v1/campuses', { params: { limit: 100 } }))
  },

  async getEnvironmentTypes() {
    return toList(await apiClient.get('/api/v1/environment-types', { params: { limit: 100 } }))
  },

  async create(environment) {
    return toUi(await apiClient.post(BASE, toPayload(environment)))
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(`${BASE}/${id}`, toPayload(updates)))
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },

  async toggleFavorite(id) {
    const result = await apiClient.post(`/api/v1/favorites/${id}/toggle`)
    return Boolean(result?.favorite)
  },
}

export default environmentService
