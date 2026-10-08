import apiClient from '../../../shared/services/apiClient'

/**
 * Los ambientes los expone ms-classroom-management. Antes se llamaba a
 * `/api/v1/environments`, ruta que solo existe en el monolito: en microservicios
 * devolvia 404 y la lista salia vacia, lo que dejaba sin nada que elegir al
 * aprovisionar un dispositivo.
 */
const BASE = '/api/v1/educational-environments'
const FAVORITES = '/api/v1/favorites'

/**
 * `isFavorite` no viene en el ambiente: es estado del usuario y vive en
 * ms-user-experience. Se resuelve aparte y se fusiona aqui.
 */
async function withFavorites(environments) {
  let favoriteIds = []
  try {
    const ids = await apiClient.get(FAVORITES)
    favoriteIds = Array.isArray(ids) ? ids : []
  } catch {
    // Sin favoritos no se rompe el listado: la UI degrada a "ninguno favorito".
    favoriteIds = []
  }
  const set = new Set(favoriteIds)
  return environments.map((env) => ({
    ...env,
    environmentId: env.educationalEnvironmentId || env.environmentId || env.id,
    id: env.educationalEnvironmentId || env.environmentId || env.id,
    name: env.name,
    location: env.code ?? env.name,
    floor: env.floor,
    capacity: env.occupancyCapacity,
    envType: env.environmentTypeId,
    isFavorite: set.has(env.educationalEnvironmentId),
  }))
}

const environmentService = {
  async getAll() {
    const data = await apiClient.get(`${BASE}?page=1&limit=100`)
    const environments = Array.isArray(data) ? data : data?.data || []
    return withFavorites(environments)
  },

  async getById(id) {
    const [env] = await withFavorites([await apiClient.get(`${BASE}/${id}`)])
    return env
  },

  async getFavorites() {
    return (await this.getAll()).filter((env) => env.isFavorite)
  },

  async create(environment) {
    return apiClient.post(BASE, {
      campusId: environment.campusId,
      code: environment.code,
      name: environment.name,
      environmentTypeId: environment.envType,
      floor: environment.floor ?? null,
      areaM2: environment.areaM2 ?? null,
      occupancyCapacity: environment.capacity ?? null,
    })
  },

  async update(id, updates) {
    return apiClient.patch(`${BASE}/${id}`, {
      name: updates.name ?? null,
      floor: updates.floor ?? null,
      areaM2: updates.areaM2 ?? null,
      occupancyCapacity: updates.capacity ?? null,
    })
  },

  async delete(id) {
    await apiClient.delete(`${BASE}/${id}`)
  },

  /** Toggle real contra ms-user-experience; devuelve el estado resultante. */
  async toggleFavorite(id) {
    const result = await apiClient.post(`${FAVORITES}/${id}/toggle`, {})
    return Boolean(result?.favorite)
  },
}

export default environmentService
