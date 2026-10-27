import { describe, it, expect, vi, beforeEach } from 'vitest'
import sensorService from '../../../modules/environment/services/sensorService'
import apiClient from '../../../shared/services/apiClient'

vi.mock('../../../shared/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    deleteWithBody: vi.fn(),
    request: vi.fn(),
  },
  getToken: () => localStorage.getItem('token'),
  clearToken: () => localStorage.removeItem('token'),
  API_BASE: 'http://localhost:8080',
}))

const mockApi = apiClient as any

describe('sensorService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('listInstallationsByEnvironment unwraps arrays', async () => {
    mockApi.get.mockResolvedValue([{ id: 'i1' }])
    const result = await sensorService.listInstallationsByEnvironment('e1')
    expect(result).toEqual([{ id: 'i1' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/sensor-installations', {
      params: { educationalEnvironmentId: 'e1', active: true, limit: 100 },
    })
  })

  it('listInstallationsByEnvironment unwraps a { data } envelope', async () => {
    mockApi.get.mockResolvedValue({ data: [{ id: 'i2' }] })
    expect(await sensorService.listInstallationsByEnvironment('e1')).toEqual([{ id: 'i2' }])
  })

  it('listInstallationsByEnvironment unwraps a { content } envelope', async () => {
    mockApi.get.mockResolvedValue({ content: [{ id: 'i3' }] })
    expect(await sensorService.listInstallationsByEnvironment('e1', { active: false })).toEqual([{ id: 'i3' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/sensor-installations', {
      params: { educationalEnvironmentId: 'e1', active: false, limit: 100 },
    })
  })

  it('listInstallationsByEnvironment returns an empty array for unknown payloads', async () => {
    mockApi.get.mockResolvedValue(null)
    expect(await sensorService.listInstallationsByEnvironment('e1')).toEqual([])
  })

  it('getSensor fetches a sensor by id', async () => {
    mockApi.get.mockResolvedValue({ sensorId: 's1' })
    const result = await sensorService.getSensor('s1')
    expect(result).toEqual({ sensorId: 's1' })
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/sensors/s1')
  })

  it('getSensor encodes the sensor id', async () => {
    mockApi.get.mockResolvedValue({ sensorId: 'a/b' })
    await sensorService.getSensor('a/b')
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/sensors/a%2Fb')
  })

  it('removeInstallation posts to the remove endpoint', async () => {
    mockApi.post.mockResolvedValue({ removed: true })
    const result = await sensorService.removeInstallation('i1')
    expect(result).toEqual({ removed: true })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/sensor-installations/i1/remove')
  })

  it('removeInstallation encodes the installation id', async () => {
    mockApi.post.mockResolvedValue(null)
    await sensorService.removeInstallation('a b')
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/sensor-installations/a%20b/remove')
  })

  it('propagates backend errors', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'))
    await expect(sensorService.getSensor('s1')).rejects.toThrow('boom')
  })
})
