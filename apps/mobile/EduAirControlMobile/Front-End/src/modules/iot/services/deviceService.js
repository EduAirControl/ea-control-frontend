/**
 * Adaptador de dispositivos IoT contra ms-sensor-management.
 *
 * Rutas reales (gateway -> ms-sensor-management:3004):
 *   GET    /api/v1/devices?educationalEnvironmentId=&status=&page=&limit=
 *   POST   /api/v1/devices            (ADMIN)
 *   PATCH  /api/v1/devices/{deviceId} (ADMIN, parcial)
 *   DELETE /api/v1/devices/{deviceId} (ADMIN)
 *   POST   /api/v1/devices/{deviceId}/touch
 *
 * El backend usa nombres en camelCase (deviceId, name, deviceType, status,
 * educationalEnvironmentId). La UI habla español, asi que el adaptador traduce en
 * un solo sitio en vez de repetir el mapeo en cada pantalla.
 */

import apiClient from '../../../shared/services/apiClient'

const BASE = '/api/v1/devices'

export const DEVICE_TYPES = ['esp32', 'esp32s3', 'esp8266', 'otro']
export const DEVICE_STATUSES = ['pendiente', 'conectado', 'offline', 'error']

/** Backend -> UI. `deviceId` sobrevive por el spread y es la clave que usan las rutas. */
function toUi(device) {
  if (!device) return device
  return {
    ...device,
    id: device.deviceId,
    nombre: device.name,
    tipo: device.deviceType,
    estado: device.status,
    idAula: device.educationalEnvironmentId,
  }
}

function toList(data) {
  // PageResponse de ms-sensor-management: { data: [...], meta: {...} }
  if (Array.isArray(data)) return data
  return data?.data || []
}

function path(id) {
  return `${BASE}/${encodeURIComponent(id)}`
}

const deviceService = {
  async getAll({ educationalEnvironmentId, status } = {}) {
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (educationalEnvironmentId) params.set('educationalEnvironmentId', educationalEnvironmentId)
    if (status && status !== 'all') params.set('status', status)
    const data = await apiClient.get(`${BASE}?${params}`)
    return toList(data).map(toUi)
  },

  async getById(id) {
    return toUi(await apiClient.get(path(id)))
  },

  async create(data) {
    return toUi(
      await apiClient.post(BASE, {
        macAddress: String(data.macAddress || '').trim().toUpperCase(),
        name: data.nombre ?? null,
        deviceType: data.tipo || 'esp32',
        firmwareVersion: data.firmwareVersion ?? null,
        ssid: data.ssid ?? null,
        educationalEnvironmentId: data.idAula || null,
      })
    )
  },

  /** Actualizacion parcial: el backend conserva los nulos. */
  async update(id, data) {
    return toUi(
      await apiClient.patch(path(id), {
        name: data.nombre ?? null,
        deviceType: data.tipo ?? null,
        firmwareVersion: data.firmwareVersion ?? null,
        ssid: data.ssid ?? null,
        status: data.estado ?? null,
        educationalEnvironmentId: data.idAula || null,
      })
    )
  },

  async markSeen(id, ssid) {
    const params = ssid ? `?ssid=${encodeURIComponent(ssid)}` : ''
    return toUi(await apiClient.post(`${path(id)}/touch${params}`, {}))
  },

  async remove(id) {
    await apiClient.delete(path(id))
  },
}

export default deviceService