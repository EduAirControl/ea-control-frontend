import apiClient from '../../../shared/services/apiClient';

const BASE = '/api/v1/educational-environments';

/**
 * Ambientes educativos (ms-classroom-management). Mapea la respuesta del
 * microservicio a la forma que usa la UI. Los campos que dependen de otros
 * servicios (location, tempMin/Max, isFavorite) quedan vacíos hasta que existan
 * ms-environment-monitoring / ms-user-experience.
 */
function toUi(env) {
  if (!env) return env;
  return {
    id: env.id,
    code: env.code,
    name: env.name,
    location: env.location || '',
    floor: env.floor,
    capacity: env.occupancyCapacity,
    envType: env.environmentTypeId,
    campusId: env.campusId,
    status: env.status,
    isFavorite: false,
    tempMin: undefined,
    tempMax: undefined,
  };
}

function toPayload(environment) {
  const payload = {};
  if (environment.campusId) payload.campusId = environment.campusId;
  if (environment.code) payload.code = environment.code;
  if (environment.name) payload.name = environment.name;
  if (environment.environmentTypeId) payload.environmentTypeId = environment.environmentTypeId;
  if (environment.envType) payload.environmentTypeId = environment.envType;
  if (environment.floor !== undefined) payload.floor = environment.floor;
  if (environment.capacity !== undefined) payload.occupancyCapacity = environment.capacity;
  if (environment.status) payload.status = environment.status;
  return payload;
}

const environmentService = {
  async getAll() {
    const data = await apiClient.get(`${BASE}?limit=100`);
    const items = data?.data || (Array.isArray(data) ? data : []);
    return items.map(toUi);
  },

  async getById(id) {
    return toUi(await apiClient.get(`${BASE}/${id}`));
  },

  async getFavorites() {
    // Los favoritos pertenecen a ms-user-experience (pendiente).
    return [];
  },

  async create(environment) {
    return toUi(await apiClient.post(BASE, toPayload(environment)));
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(`${BASE}/${id}`, toPayload(updates)));
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  async toggleFavorite() {
    // Los favoritos pertenecen a ms-user-experience (pendiente).
    return false;
  },
};

export default environmentService;
