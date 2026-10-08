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

  async getByEnvironment(environmentId) {
    const data = await apiClient.get(`/api/v1/sensor-installations?educationalEnvironmentId=${environmentId}&active=true`);
    const items = data?.data || (Array.isArray(data) ? data : []);
    const sensorIds = items.map((inst) => inst.sensorId);
    if (sensorIds.length === 0) return [];
    const sensors = await Promise.all(sensorIds.map((id) => this.getById(id)));
    return sensors.filter(Boolean);
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
    const sensor = await this.getById(id);
    const newStatus = sensor.sensorStatusId === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.update(id, { sensorStatusId: newStatus });
  },
};

export default sensorService;
