import apiClient from '../../../shared/services/apiClient';

const INSTALLATIONS = '/api/v1/sensor-installations';
const SENSORS = '/api/v1/sensors';

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

const sensorService = {
  async listInstallationsByEnvironment(educationalEnvironmentId, { active = true } = {}) {
    return toList(
      await apiClient.get(INSTALLATIONS, {
        params: { educationalEnvironmentId, active, limit: 100 },
      })
    );
  },

  async getSensor(sensorId) {
    return apiClient.get(`${SENSORS}/${encodeURIComponent(sensorId)}`);
  },

  removeInstallation(installationId) {
    return apiClient.post(`${INSTALLATIONS}/${encodeURIComponent(installationId)}/remove`);
  },
};

export default sensorService;
