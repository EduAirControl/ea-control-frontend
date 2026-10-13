import apiClient from '../../../shared/services/apiClient'

/**
 * Alertas de ms-environment-monitoring (enrutadas por el gateway).
 */
const BASE = '/api/v1/alerts'

const alertService = {
  /** @returns {Promise<Array>} alertas con el shape de AlertView del backend. */
  async list(params = {}) {
    const rows = await apiClient.get(BASE, { params })
    return Array.isArray(rows) ? rows : []
  },

  async listActive(limit = 50) {
    return this.list({ status: 'ACTIVE', limit })
  },

  /** Reconoce una alerta activa (sale del token del usuario). */
  async acknowledge(id) {
    return apiClient.post(`${BASE}/${id}/acknowledge`)
  },
}

export default alertService
