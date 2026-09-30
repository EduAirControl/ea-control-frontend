import apiClient from '../../../shared/services/apiClient'

const BASE = '/api/devices'

const deviceService = {
  async getAll() {
    return apiClient.get(BASE)
  },

  async getById(id) {
    return apiClient.get(`${BASE}/${id}`)
  },

  async create(data) {
    return apiClient.post(BASE, {
      macAddress: data.macAddress,
      nombre: data.nombre || null,
      tipo: data.tipo || 'esp32',
      idAula: data.idAula ?? null,
      ssid: data.ssid || null,
      estado: data.estado || 'pendiente',
      firmwareVersion: data.firmwareVersion || null,
    })
  },

  async update(id, data) {
    return apiClient.put(`${BASE}/${id}`, data)
  },

  async remove(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },
}

export default deviceService
