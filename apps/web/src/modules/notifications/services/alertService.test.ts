import { describe, it, expect, vi, beforeEach } from 'vitest'
import alertService from '../../../modules/notifications/services/alertService'
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

describe('alertService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('list returns the array from the backend', async () => {
    mockApi.get.mockResolvedValue([{ id: 'a1' }])
    const result = await alertService.list({ status: 'ACTIVE', limit: 10 })
    expect(result).toEqual([{ id: 'a1' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/alerts', {
      params: { status: 'ACTIVE', limit: 10 },
    })
  })

  it('list returns an empty array when the payload is not an array', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    expect(await alertService.list()).toEqual([])
  })

  it('listActive filters by ACTIVE status', async () => {
    mockApi.get.mockResolvedValue([{ id: 'a1', status: 'ACTIVE' }])
    const result = await alertService.listActive(25)
    expect(result).toEqual([{ id: 'a1', status: 'ACTIVE' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/alerts', {
      params: { status: 'ACTIVE', limit: 25 },
    })
  })

  it('listActive uses a default limit of 50', async () => {
    mockApi.get.mockResolvedValue([])
    await alertService.listActive()
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/alerts', {
      params: { status: 'ACTIVE', limit: 50 },
    })
  })

  it('acknowledge posts to the acknowledge endpoint', async () => {
    mockApi.post.mockResolvedValue({ id: 'a1', status: 'ACKNOWLEDGED' })
    const result = await alertService.acknowledge('a1')
    expect(result).toEqual({ id: 'a1', status: 'ACKNOWLEDGED' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/alerts/a1/acknowledge')
  })

  it('delete calls the delete endpoint and returns null on 204', async () => {
    mockApi.delete.mockResolvedValue(null)
    const result = await alertService.delete('a1')
    expect(result).toBeNull()
    expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/alerts/a1')
  })

  it('propagates backend errors', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'))
    await expect(alertService.list()).rejects.toThrow('boom')
  })
})
