import { describe, it, expect, vi, beforeEach } from 'vitest'
import institutionService from '../../../modules/admin/services/institutionService'
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

describe('institutionService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('getAll returns the array from the backend', async () => {
    mockApi.get.mockResolvedValue([{ id: 'i1' }])
    expect(await institutionService.getAll()).toEqual([{ id: 'i1' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/institutions')
  })

  it('getAll returns an empty array when the payload is not an array', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    expect(await institutionService.getAll()).toEqual([])
  })

  it('getById calls the institution endpoint', async () => {
    mockApi.get.mockResolvedValue({ id: 'i1', code: 'SEN-444' })
    const result = await institutionService.getById('i1')
    expect(result).toEqual({ id: 'i1', code: 'SEN-444' })
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/institutions/i1')
  })

  it('create posts the institution payload', async () => {
    mockApi.post.mockResolvedValue({ id: 'i2' })
    const result = await institutionService.create({ code: 'ABC', name: 'Acme', type: 'UNIVERSITY' })
    expect(result).toEqual({ id: 'i2' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/institutions', {
      code: 'ABC',
      name: 'Acme',
      type: 'UNIVERSITY',
    })
  })

  it('update puts the editable fields', async () => {
    mockApi.put.mockResolvedValue({ id: 'i1', name: 'New' })
    const result = await institutionService.update('i1', { name: 'New', type: 'SCHOOL', status: 'ACTIVE' })
    expect(result).toEqual({ id: 'i1', name: 'New' })
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/institutions/i1', {
      name: 'New',
      type: 'SCHOOL',
      status: 'ACTIVE',
    })
  })

  it('propagates backend errors', async () => {
    mockApi.get.mockRejectedValue(new Error('unauthorized'))
    await expect(institutionService.getById('i1')).rejects.toThrow('unauthorized')
  })
})
