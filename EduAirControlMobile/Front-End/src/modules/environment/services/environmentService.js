import apiClient from '../../../shared/services/apiClient'

const BASE = '/api/v1/environments'

/**
 * El backend devuelve `favorite` y la UI usa `isFavorite` (mismo mapeo que el web).
 */
function toUi(env) {
  if (!env) return env
  return { ...env, isFavorite: Boolean(env.favorite) }
}

function toList(data) {
  return Array.isArray(data) ? data : data?.items || []
}

const environmentService = {
  async getAll() {
    return toList(await apiClient.get(BASE)).map(toUi)
  },

  async getById(id) {
    return toUi(await apiClient.get(`${BASE}/${id}`))
  },

  async getFavorites() {
    return (await this.getAll()).filter((env) => env.isFavorite)
  },

  async create(environment) {
    return toUi(
      await apiClient.post(BASE, {
        name: environment.name,
        location: environment.location,
        floor: environment.floor,
        capacity: environment.capacity,
        envType: environment.envType,
        tempMin: environment.tempMin,
        tempMax: environment.tempMax,
      })
    )
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(`${BASE}/${id}`, updates))
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },

  async toggleFavorite(id) {
    const result = await apiClient.post(`${BASE}/${id}/favorite`, {})
    return Boolean(result?.isFavorite)
  },
}

export default environmentService
