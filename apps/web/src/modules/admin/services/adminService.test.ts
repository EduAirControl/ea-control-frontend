import { describe, it, expect, vi, beforeEach } from 'vitest'
import adminService from '../../../modules/admin/services/adminService'
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

describe('adminService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('listUsers returns the array from the backend', async () => {
    mockApi.get.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }])
    const result = await adminService.listUsers()
    expect(result).toEqual([{ id: 'u1' }, { id: 'u2' }])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/users')
  })

  it('listUsers returns an empty array when the backend payload is not an array', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    expect(await adminService.listUsers()).toEqual([])
  })

  it('listUsers propagates backend errors', async () => {
    mockApi.get.mockRejectedValue(new Error('forbidden'))
    await expect(adminService.listUsers()).rejects.toThrow('forbidden')
  })

  it('assignRoles sends the role names in the expected shape', async () => {
    mockApi.put.mockResolvedValue({ ok: true })
    const result = await adminService.assignRoles('u1', ['ADMIN', 'USER'])
    expect(result).toEqual({ ok: true })
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/admin/users/u1/roles', {
      roleNames: ['ADMIN', 'USER'],
    })
  })

  it('assignRoles propagates backend errors', async () => {
    mockApi.put.mockRejectedValue(new Error('not found'))
    await expect(adminService.assignRoles('u1', ['ADMIN'])).rejects.toThrow('not found')
  })

  it('listRoles returns the array from the backend', async () => {
    mockApi.get.mockResolvedValue(['ADMIN', 'USER'])
    expect(await adminService.listRoles()).toEqual(['ADMIN', 'USER'])
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/roles')
  })

  it('listRoles returns an empty array when the backend payload is not an array', async () => {
    mockApi.get.mockResolvedValue(null)
    expect(await adminService.listRoles()).toEqual([])
  })
})
