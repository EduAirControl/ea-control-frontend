import apiClient from '../../../shared/services/apiClient'

const BASE = '/api/v1/devices'

/**
 * Adaptador de nombres: la UI maneja `nombre`/`tipo`/`estado`/`idAula` y el
 * backend expone `name`/`deviceType`/`status`/`educationalEnvironmentId`.
 */
function toUi(device) {
  if (!device) return device
  return {
    ...device,
    nombre: device.name,
    tipo: device.deviceType,
    estado: device.status,
    idAula: device.educationalEnvironmentId,
  }
}

function toList(data) {
  return Array.isArray(data) ? data : data?.items || []
}

function path(id) {
  return `${BASE}/${encodeURIComponent(id)}`
}

const deviceService = {
  async getAll() {
    return toList(await apiClient.get(BASE)).map(toUi)
  },

  async create(data) {
    return toUi(
      await apiClient.post(BASE, {
        macAddress: String(data.macAddress || '').trim().toUpperCase(),
        name: data.nombre || null,
        deviceType: data.tipo || 'esp32',
        firmwareVersion: data.firmwareVersion || null,
        ssid: data.ssid || null,
        educationalEnvironmentId: data.idAula || null,
      })
    )
  },

  async update(id, data) {
    return toUi(
      await apiClient.put(path(id), {
        name: data.nombre,
        deviceType: data.tipo,
        firmwareVersion: data.firmwareVersion,
        ssid: data.ssid,
        status: data.estado,
        educationalEnvironmentId: data.idAula,
      })
    )
  },

  async remove(id) {
    return apiClient.delete(path(id))
  },
}

export default deviceService
