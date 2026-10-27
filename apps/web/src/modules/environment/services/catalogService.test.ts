import { describe, it, expect, vi, beforeEach } from 'vitest'
import catalogService from '../../../modules/environment/services/catalogService'
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

describe('catalogService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('getCampuses maps the backend payload and unwraps arrays', async () => {
    mockApi.get.mockResolvedValue([
      { campusId: 'c1', code: 'C1', name: 'Campus 1', city: 'Bogota', status: 'ACTIVE' },
    ])
    const result = await catalogService.getCampuses()
    expect(result).toEqual([
      { id: 'c1', code: 'C1', name: 'Campus 1', city: 'Bogota', status: 'ACTIVE' },
    ])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/campuses', { params: { limit: 100 } })
  })

  it('getCampuses unwraps a { data } envelope', async () => {
    mockApi.get.mockResolvedValue({
      data: [{ id: 'c2', code: 'C2', name: 'Campus 2' }],
    })
    const result = await catalogService.getCampuses()
    expect(result).toEqual([{ id: 'c2', code: 'C2', name: 'Campus 2', city: undefined, status: undefined }])
  })

  it('getCampuses returns an empty array when the payload is neither an array nor a { data } envelope', async () => {
    mockApi.get.mockResolvedValue(null)
    expect(await catalogService.getCampuses()).toEqual([])
  })

  it('createCampus trims, uppercases and posts the campus', async () => {
    mockApi.post.mockResolvedValue({ campusId: 'c3' })
    const result = await catalogService.createCampus({
      code: '  abc  ',
      name: '  New Campus  ',
      city: '  Medellin  ',
    })
    expect(result).toEqual({ campusId: 'c3' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/campuses', {
      code: 'ABC',
      name: 'New Campus',
      city: 'Medellin',
      status: 'ACTIVE',
    })
  })

  it('createCampus omits an empty city', async () => {
    mockApi.post.mockResolvedValue({ campusId: 'c4' })
    await catalogService.createCampus({ code: 'X', name: 'Y', city: '   ' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/campuses', {
      code: 'X',
      name: 'Y',
      city: undefined,
      status: 'ACTIVE',
    })
  })

  it('getEnvironmentTypes maps the backend payload', async () => {
    mockApi.get.mockResolvedValue([
      { environmentTypeId: 't1', code: 'CLASSROOM', name: 'Aula', description: 'desc' },
    ])
    const result = await catalogService.getEnvironmentTypes()
    expect(result).toEqual([
      { id: 't1', code: 'CLASSROOM', name: 'Aula', description: 'desc' },
    ])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/environment-types', { params: { limit: 100 } })
  })

  it('propagates backend errors', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'))
    await expect(catalogService.getCampuses()).rejects.toThrow('boom')
  })
})
