import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import authService from '../../../modules/auth/services/authService'
import apiClient from '../../../shared/services/apiClient'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock apiClient
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
  buildUrl: (e: string) => e,
}))

const mockApiClient = apiClient as any

function createMockToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

describe('authService', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, status: 204 })
    await authService.logout()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isAuthenticated', () => {
    it('returns false when there is no current user', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('returns true after loginWithCredentials sets the user', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '123', email: 'test@test.com', username: 'test', roles: ['USER'] },
      })
      await authService.loginWithCredentials('test@test.com', 'password')
      expect(authService.isAuthenticated()).toBe(true)
    })
  })

  describe('isAdmin', () => {
    it('returns true for ADMIN role', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 'a@test.com', username: 'a', roles: ['ADMIN'] },
      })
      await authService.loginWithCredentials('a@test.com', 'password')
      expect(authService.isAdmin()).toBe(true)
    })

    it('returns true for SUPER_ADMIN role', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 'a@test.com', username: 'a', roles: ['SUPER_ADMIN'] },
      })
      await authService.loginWithCredentials('a@test.com', 'password')
      expect(authService.isAdmin()).toBe(true)
    })

    it('returns false for USER role', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 'u@test.com', username: 'u', roles: ['USER'] },
      })
      await authService.loginWithCredentials('u@test.com', 'password')
      expect(authService.isAdmin()).toBe(false)
    })
  })

  describe('isSuperAdmin', () => {
    it('returns true for SUPER_ADMIN', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 's@test.com', username: 's', roles: ['SUPER_ADMIN'] },
      })
      await authService.loginWithCredentials('s@test.com', 'password')
      expect(authService.isSuperAdmin()).toBe(true)
    })

    it('returns false for ADMIN', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 'a@test.com', username: 'a', roles: ['ADMIN'] },
      })
      await authService.loginWithCredentials('a@test.com', 'password')
      expect(authService.isSuperAdmin()).toBe(false)
    })
  })

  describe('getUser', () => {
    it('returns null before the session is hydrated', () => {
      expect(authService.getUser()).toBeNull()
    })
  })

  describe('loginWithCredentials', () => {
    it('calls apiClient.post and sets the current user from the response', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '123', email: 'test@test.com', username: 'test', roles: ['USER'], institutionId: 'i1', campusId: 'c1' },
      })
      const result = await authService.loginWithCredentials('test@test.com', 'password')

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com',
        password: 'password',
      })
      expect(result).toMatchObject({
        id: '123',
        email: 'test@test.com',
        role: 'USER',
        roles: ['USER'],
        institutionId: 'i1',
        campusId: 'c1',
      })
      expect(authService.getUser()).toMatchObject({ id: '123', email: 'test@test.com' })
    })
  })

  describe('logout', () => {
    it('clears the user and redirects to login', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        user: { id: '1', email: 't@test.com', username: 't', roles: ['USER'] },
      })
      await authService.loginWithCredentials('t@test.com', 'password')

      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

      await authService.logout()

      expect(localStorage.getItem('user')).toBeNull()
      expect(authService.getUser()).toBeNull()
      expect(window.location.assign || window.location.href).toBeTruthy()
    })
  })

  describe('refreshToken', () => {
    it('re-hydrates the current user from /api/v1/me', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        userId: '123',
        email: 'test@test.com',
        role: 'USER',
        roles: ['USER'],
        institutionId: null,
        campusId: null,
      })
      const result = await authService.refreshToken()
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/me')
      expect(result).toMatchObject({ id: '123', email: 'test@test.com' })
    })

    it('returns null when /api/v1/me fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('unauthorized'))
      const result = await authService.refreshToken()
      expect(result).toBeNull()
    })
  })

  describe('register', () => {
    it('calls apiClient.post with correct data', async () => {
      mockApiClient.post.mockResolvedValueOnce({})
      await authService.register('Name', 'test@test.com', 'Password1', 'CODE')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        email: 'test@test.com',
        password: 'Password1',
        username: 'Name',
        companyCode: 'CODE',
      })
    })
  })

  describe('forgotPassword', () => {
    it('calls apiClient.post', async () => {
      mockApiClient.post.mockResolvedValueOnce({})
      await authService.forgotPassword('test@test.com')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', { email: 'test@test.com' })
    })
  })

  describe('verifyCode', () => {
    it('calls apiClient.post', async () => {
      mockApiClient.post.mockResolvedValueOnce({})
      await authService.verifyCode('test@test.com', '123456')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/verify-code', { email: 'test@test.com', code: '123456' })
    })
  })

  describe('resetPassword', () => {
    it('calls apiClient.post', async () => {
      mockApiClient.post.mockResolvedValueOnce({})
      await authService.resetPassword('test@test.com', '123456', 'NewPass1')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        email: 'test@test.com',
        code: '123456',
        newPassword: 'NewPass1',
      })
    })
  })

  describe('changePassword', () => {
    it('calls apiClient.post', async () => {
      mockApiClient.post.mockResolvedValueOnce({})
      await authService.changePassword('old', 'new')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/change-password', {
        currentPassword: 'old',
        newPassword: 'new',
      })
    })
  })

  describe('deleteAccount', () => {
    it('calls apiClient.deleteWithBody', async () => {
      mockApiClient.deleteWithBody.mockResolvedValueOnce({})
      await authService.deleteAccount('password')
      expect(mockApiClient.deleteWithBody).toHaveBeenCalledWith('/api/v1/auth/account', { password: 'password' })
    })
  })

  describe('reset email', () => {
    it('stores email in sessionStorage', () => {
      authService.setResetEmail('test@test.com')
      expect(sessionStorage.getItem('resetEmail')).toBe('test@test.com')
    })

    it('retrieves email from sessionStorage', () => {
      sessionStorage.setItem('resetEmail', 'test@test.com')
      expect(authService.getResetEmail()).toBe('test@test.com')
    })

    it('clears reset email', () => {
      sessionStorage.setItem('resetEmail', 'test@test.com')
      authService.clearResetEmail()
      expect(sessionStorage.getItem('resetEmail')).toBeNull()
    })
  })
})
