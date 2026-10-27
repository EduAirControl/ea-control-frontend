import { describe, it, expect, vi, beforeEach } from 'vitest'
import profileService from '../../../modules/profile/services/profileService'
import apiClient from '../../../shared/services/apiClient'
import authService from '../../../modules/auth/services/authService'

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

vi.mock('../../../modules/auth/services/authService', () => ({
  default: {
    getUser: vi.fn(),
  },
}))

const mockApi = apiClient as any
const mockAuth = authService as any

describe('profileService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('get returns an empty profile when there is no authenticated user', async () => {
    mockAuth.getUser.mockReturnValue(null)
    const result = await profileService.get()
    expect(result).toEqual({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' })
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('get maps the remote profile to the UI shape', async () => {
    mockAuth.getUser.mockReturnValue({ id: 'u1', name: 'Jane', email: 'jane@test.com' })
    mockApi.get.mockResolvedValue({
      fullName: 'Jane Doe',
      position: 'Teacher',
      phone: '123',
      department: 'Science',
      avatarUrl: 'http://img',
    })
    const result = await profileService.get()
    expect(result).toEqual({
      fullName: 'Jane Doe',
      email: 'jane@test.com',
      title: 'Teacher',
      phone: '123',
      location: 'Science',
      avatarUrl: 'http://img',
    })
  })

  it('get falls back to the identity when there is no remote profile', async () => {
    mockAuth.getUser.mockReturnValue({ id: 'u1', name: 'Jane', email: 'jane@test.com' })
    mockApi.get.mockRejectedValue(new Error('not found'))
    const result = await profileService.get()
    expect(result).toEqual({ fullName: 'Jane', email: 'jane@test.com', title: '', phone: '', location: '', avatarUrl: '' })
  })

  it('get returns identity-based profile when the user has no id', async () => {
    mockAuth.getUser.mockReturnValue({ name: 'Jane', email: 'jane@test.com' })
    const result = await profileService.get()
    expect(result).toEqual({ fullName: 'Jane', email: 'jane@test.com', title: '', phone: '', location: '', avatarUrl: '' })
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('save updates an existing profile', async () => {
    mockAuth.getUser.mockReturnValue({ id: 'u1' })
    mockApi.get.mockResolvedValue({ id: 'p1' })
    mockApi.put.mockResolvedValue({ id: 'p1', fullName: 'Jane' })
    const result = await profileService.save({
      fullName: 'Jane',
      title: 'Teacher',
      phone: '123',
      location: 'Science',
      avatarUrl: 'http://img',
    })
    expect(result).toEqual({ id: 'p1', fullName: 'Jane' })
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/p1', {
      fullName: 'Jane',
      position: 'Teacher',
      phone: '123',
      department: 'Science',
      avatarUrl: 'http://img',
    })
  })

  it('save creates a profile when none exists', async () => {
    mockAuth.getUser.mockReturnValue({ id: 'u1' })
    mockApi.get.mockRejectedValue(new Error('not found'))
    mockApi.post.mockResolvedValue({ id: 'p2' })
    const result = await profileService.save({
      fullName: 'Jane',
      title: '',
      phone: '',
      location: '',
      avatarUrl: '',
    })
    expect(result).toEqual({ id: 'p2' })
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users', {
      userId: 'u1',
      fullName: 'Jane',
      position: '',
      phone: '',
      department: '',
      avatarUrl: '',
    })
  })

  it('save returns a local profile when there is no authenticated user', async () => {
    mockAuth.getUser.mockReturnValue(null)
    const result = await profileService.save({ fullName: 'Jane', title: 'T', phone: '1', location: 'L', avatarUrl: '' })
    expect(result).toMatchObject({ fullName: 'Jane', phone: '1' })
    expect(mockApi.get).not.toHaveBeenCalled()
    expect(mockApi.post).not.toHaveBeenCalled()
  })
})
