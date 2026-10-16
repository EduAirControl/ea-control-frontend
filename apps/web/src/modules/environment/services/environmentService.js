import apiClient from '../../../shared/services/apiClient';
import catalogService from './catalogService';
import {
  mapMetricsByEnvironment,
  deriveStatusKey,
} from '../utils/environmentMetrics';

const BASE = '/api/v1/educational-environments';

/**
 * Ambientes educativos (ms-classroom-management) + métricas
 * (ms-environment-monitoring).
 *
 * <p>Las métricas vienen de {@code GET /api/v1/environments/current}, una sola
 * llamada con la última medición de cada (ambiente, variable). Sin ellas la UI
 * no puede mostrar temperatura, ranking ni estado: antes quedaban
 * {@code undefined} y el score siempre daba 100.
 *
 * <p>El backend no tiene campo «edificio»: la UI lo resuelve con el nombre del
 * campus, que es lo que el filtro de {@code EnvironmentFilters} y el dashboard
 * esperan en {@code building}.
 */
function toUi(env, metrics, campusNameById, favoriteIds) {
  if (!env) return env;
  // El backend expone `educationalEnvironmentId`; los mocks usaban `id`.
  const envId = env.educationalEnvironmentId ?? env.id;
  const m = metrics?.[envId];
  const campusName = campusNameById?.[env.campusId] || '';
  return {
    id: envId,
    code: env.code,
    name: env.name,
    location: env.location || campusName,
    floor: env.floor,
    areaM2: env.areaM2,
    capacity: env.occupancyCapacity,
    envType: env.environmentTypeId,
    campusId: env.campusId,
    campusName,
    building: campusName,
    status: env.status,
    isFavorite: Boolean(favoriteIds && favoriteIds.has && favoriteIds.has(envId)),
    // Métricas del backend (ms-environment-monitoring)
    temp: m?.temp,
    humidity: m?.humidity,
    co2: m?.co2,
    noise: m?.noise,
    measuredAt: m?.measuredAt,
    statusKey: deriveStatusKey(m),
  };
}

function toPayload(environment) {
  const payload = {};
  // Obligatorios en ms-classroom-management: sin ellos la creación devuelve 400.
  if (environment.campusId) payload.campusId = environment.campusId;
  if (environment.code) payload.code = environment.code;
  if (environment.name) payload.name = environment.name;
  if (environment.environmentTypeId) payload.environmentTypeId = environment.environmentTypeId;
  else if (environment.envType) payload.environmentTypeId = environment.envType;
  if (environment.floor !== undefined && environment.floor !== null && environment.floor !== '') {
    payload.floor = Number(environment.floor);
  }
  if (environment.capacity !== undefined) payload.occupancyCapacity = Number(environment.capacity);
  if (environment.status) payload.status = environment.status;
  return payload;
}

const environmentService = {
  /** Última medición por (ambiente, variable) de todos los ambientes. */
  async getMetrics() {
    const rows = await apiClient.get('/api/v1/environments/current');
    return mapMetricsByEnvironment(Array.isArray(rows) ? rows : []);
  },

  async getAll() {
    const [data, metrics, campuses, favoriteIds] = await Promise.all([
      apiClient.get(`${BASE}`, { params: { limit: 100 } }),
      // Si el servicio de métricas no responde, el listado se pinta igual
      // (sin métricas) en vez de quedarse en blanco.
      environmentService.getMetrics().catch(() => ({})),
      catalogService.getCampuses().catch(() => []),
      // Favoritos (ms-user-experience): best-effort, la lista sigue siendo válida.
      environmentService.getFavorites().catch(() => []),
    ]);
    const campusNameById = Object.fromEntries(
      campuses.map((c) => [c.id, c.name])
    );
    const favoriteSet = new Set(favoriteIds);
    const items = data?.data || (Array.isArray(data) ? data : []);
    return items.map((env) => toUi(env, metrics, campusNameById, favoriteSet));
  },

  async getById(id) {
    const [env, metrics, campuses, favoriteIds] = await Promise.all([
      apiClient.get(`${BASE}/${id}`),
      environmentService.getMetrics().catch(() => ({})),
      catalogService.getCampuses().catch(() => []),
      environmentService.getFavorites().catch(() => []),
    ]);
    const campusNameById = Object.fromEntries(
      campuses.map((c) => [c.id, c.name])
    );
    return toUi(env, metrics, campusNameById, new Set(favoriteIds));
  },

  async getFavorites() {
    const ids = await apiClient.get('/api/v1/favorites');
    return Array.isArray(ids) ? ids : [];
  },

  async create(environment) {
    return toUi(await apiClient.post(BASE, toPayload(environment)), {}, {}, new Set());
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(`${BASE}/${id}`, toPayload(updates)), {}, {}, new Set());
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  async toggleFavorite(id) {
    const result = await apiClient.post(`/api/v1/favorites/${id}/toggle`);
    return result?.favorite ?? false;
  },

  /**
   * Umbrales WARNING efectivos del ambiente (ms-environment-monitoring).
   * El backend devuelve los del ambiente si se configuraron, si no los del
   * tipo; el campo `source` indica cuál aplica ('ENVIRONMENT' | 'TYPE').
   */
  async getThresholds(environmentId) {
    return apiClient.get(`/api/v1/environments/${environmentId}/thresholds`);
  },

  /**
   * Guarda el rango de temperatura (WARNING) de este ambiente como override.
   * El resto de variables conserva el umbral del tipo.
   */
  async updateTemperatureThreshold(environmentId, minValue, maxValue) {
    return apiClient.put(`/api/v1/environments/${environmentId}/thresholds/temperature`, {
      minValue: Number(minValue),
      maxValue: Number(maxValue),
    });
  },
};

export default environmentService;
