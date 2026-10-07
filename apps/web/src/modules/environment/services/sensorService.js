import apiClient from '../../../shared/services/apiClient';

const BASE = '/api/v1/sensors';

/**
 * Sensores (ms-sensor-management). El microservicio identifica sensores por UUID
 * (no por serial) y no expone /toggle ni environmentId (eso vive en las
 * instalaciones). Mapeo pragmático a la forma de la UI.
 */
function toUi(sensor) {
  if (!sensor) return sensor;
  return {
    id: sensor.sensorId,
    name: sensor.serialNumber,
    serialNumber: sensor.serialNumber,
    sensorModelId: sensor.sensorModelId,
    sensorStatusId: sensor.sensorStatusId,
    status: sensor.sensorStatusId,
    lastSeenAt: sensor.lastSeenAt,
    environmentId: undefined,
    variable: undefined,
    isActive: true,
  };
}

const sensorService = {
  async getAll() {
    const data = await apiClient.get(`${BASE}?limit=100`);
    const items = data?.data || (Array.isArray(data) ? data : []);
    return items.map(toUi);
  },

  async getByEnvironment() {
    // La relación sensor-ambiente vive en las instalaciones (pendiente).
    return [];
  },

  async getById(id) {
    return toUi(await apiClient.get(`${BASE}/${id}`));
  },

  async create(sensor) {
    return toUi(await apiClient.post(BASE, {
      serialNumber: sensor.serialNumber || sensor.name,
      sensorModelId: sensor.sensorModelId,
      sensorStatusId: sensor.sensorStatusId,
    }));
  },

  async update(id, updates) {
    return toUi(await apiClient.patch(`${BASE}/${id}`, updates));
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  async toggleActive(id) {
    // El microservicio no tiene /toggle; el estado se gestiona por sensorStatusId.
    return this.getById(id);
  },
};

export default sensorService;
