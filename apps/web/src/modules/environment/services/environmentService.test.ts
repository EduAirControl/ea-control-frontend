import { describe, it, expect, vi, beforeEach } from 'vitest'
import environmentService from '../../../modules/environment/services/environmentService'
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

describe('environmentService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('getMetrics maps rows by environment', async () => {
    mockApi.get.mockResolvedValue([
      { educationalEnvironmentId: 'e1', temperature: 22, humidity: 40 },
    ])
    const result = await environmentService.getMetrics()
    expect(result).toBeDefined()
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/environments/current')
  })

  it('getMetrics returns an empty object when the backend fails to provide rows', async () => {
    mockApi.get.mockResolvedValue(null)
    const result = await environmentService.getMetrics()
    expect(result).toEqual({})
  })

  it('getAll maps environments to the UI shape using metrics and campuses', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/v1/educational-environments')) {
        return Promise.resolve({
          data: [{ educationalEnvironmentId: 'e1', campusId: 'c1', code: 'A1', name: 'Room', status: 'ACTIVE' }],
        })
      }
      if (url.startsWith('/api/v1/environments/current')) return Promise.resolve([])
      if (url.startsWith('/api/v1/campuses')) return Promise.resolve([{ campusId: 'c1', name: 'Campus 1' }])
      if (url.startsWith('/api/v1/favorites')) return Promise.resolve([])
      return Promise.resolve(null)
    })
    const result = await environmentService.getAll()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'e1', code: 'A1', name: 'Room', campusName: 'Campus 1', building: 'Campus 1' })
  })

  it('getAll still returns environments when metrics fail', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/v1/educational-environments')) {
        return Promise.resolve([{ educationalEnvironmentId: 'e1', campusId: 'c1', code: 'A1', name: 'Room' }])
      }
      if (url.startsWith('/api/v1/environments/current')) return Promise.reject(new Error('down'))
      if (url.startsWith('/api/v1/campuses')) return Promise.reject(new Error('down'))
      if (url.startsWith('/api/v1/favorites')) return Promise.reject(new Error('down'))
      return Promise.resolve(null)
    })
    const result = await environmentService.getAll()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('e1')
  })

  it('getById returns the UI shape for a single environment', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/v1/educational-environments/')) {
        return Promise.resolve({ educationalEnvironmentId: 'e2', campusId: 'c1', code: 'B1', name: 'Lab' })
      }
      if (url.startsWith('/api/v1/environments/current')) return Promise.resolve([])
      if (url.startsWith('/api/v1/campuses')) return Promise.resolve([{ campusId: 'c1', name: 'Campus 1' }])
      if (url.startsWith('/api/v1/favorites')) return Promise.resolve([])
      return Promise.resolve(null)
    })
    const result = await environmentService.getById('e2')
    expect(result).toMatchObject({ id: 'e2', code: 'B1', name: 'Lab' })
  })

  it('create posts the payload and returns the UI shape', async () => {
    mockApi.post.mockResolvedValue({ educationalEnvironmentId: 'e3', code: 'C1', name: 'New' })
    const result = await environmentService.create({ code: 'C1', name: 'New', campusId: 'c1', environmentTypeId: 't1' })
    expect(result).toMatchObject({ id: 'e3', code: 'C1', name: 'New' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/educational-environments', expect.objectContaining({
      code: 'C1',
      name: 'New',
      campusId: 'c1',
      environmentTypeId: 't1',
    }))
  })

  it('update patches the environment', async () => {
    mockApi.patch.mockResolvedValue({ educationalEnvironmentId: 'e1', code: 'A1', name: 'Renamed' })
    const result = await environmentService.update('e1', { name: 'Renamed' })
    expect(result).toMatchObject({ id: 'e1', name: 'Renamed' })
    expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/educational-environments/e1', expect.any(Object))
  })

  it('delete calls the delete endpoint', async () => {
    mockApi.delete.mockResolvedValue(null)
    await environmentService.delete('e1')
    expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/educational-environments/e1')
  })

  it('toggleFavorite returns the favorite flag from the backend', async () => {
    mockApi.post.mockResolvedValue({ favorite: true })
    expect(await environmentService.toggleFavorite('e1')).toBe(true)
    mockApi.post.mockResolvedValue({})
    expect(await environmentService.toggleFavorite('e1')).toBe(false)
  })

  it('getThresholds calls the thresholds endpoint', async () => {
    mockApi.get.mockResolvedValue({ minValue: 0, maxValue: 100 })
    const result = await environmentService.getThresholds('e1')
    expect(result).toEqual({ minValue: 0, maxValue: 100 })
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/environments/e1/thresholds')
  })

  it('updateThresholds puts the threshold payload', async () => {
    mockApi.put.mockResolvedValue({ ok: true })
    await environmentService.updateThresholds('e1', 'CO2', { minValue: 0, maxValue: 1000 })
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/environments/e1/thresholds/CO2', {
      severityCode: 'WARNING',
      minValue: 0,
      maxValue: 1000,
    })
  })

  it('updateAllThresholds maps the thresholds array', async () => {
    mockApi.put.mockResolvedValue({ ok: true })
    await environmentService.updateAllThresholds('e1', [
      { variableCode: 'CO2', severityCode: 'WARNING', minValue: 0, maxValue: 1000 },
    ])
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/environments/e1/thresholds', {
      thresholds: [{ variableCode: 'CO2', severityCode: 'WARNING', minValue: 0, maxValue: 1000 }],
    })
  })

  it('getFavorites returns an array of ids', async () => {
    mockApi.get.mockResolvedValue(['e1', 'e2'])
    expect(await environmentService.getFavorites()).toEqual(['e1', 'e2'])
  })

  it('getFavorites returns an empty array when the backend payload is not an array', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    expect(await environmentService.getFavorites()).toEqual([])
  })
})
