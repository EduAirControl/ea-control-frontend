import apiClient from '../../../shared/services/apiClient';

/**
 * Alertas ambientales — ms-environment-monitoring.
 *
 * <p>Son las que genera el servicio al evaluar las mediciones contra los umbrales
 * (ADR-014). Antes el panel de notificaciones las calculaba en el navegador a
 * partir de métricas que nunca llegaban, así que nunca aparecía ninguna.
 */
const BASE = '/api/v1/alerts';

const alertService = {
  /**
   * @param {{environment?: string, status?: string, page?: number, limit?: number}} params
   */
  async list(params = {}) {
    const data = await apiClient.get(BASE, { params });
    return Array.isArray(data) ? data : [];
  },

  async listActive(limit = 50) {
    return alertService.list({ status: 'ACTIVE', limit });
  },

  async acknowledge(id) {
    return apiClient.post(`${BASE}/${id}/acknowledge`);
  },

  async delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },
};

export default alertService;
