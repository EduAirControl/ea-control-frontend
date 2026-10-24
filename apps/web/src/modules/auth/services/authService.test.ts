import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import authService from '../../../modules/auth/services/authService'
import apiClient from '../../../shared/services/apiClient'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock apiClient (getToken/clearToken reales: isAuthenticated y getCurrentUser
// los usan para leer la sesión de localStorage)
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

const mockApiClient = apiClient

describe('authService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  describe('decodeJWT', () => {
    it('should decode a valid JWT', () => {
      const payload = { sub: '123', email: 'test@test.com', roles: ['ADMIN'] }
      const encoded = btoa(JSON.stringify(payload))
      const token = `header.${btoa(JSON.stringify(payload))}.signature`
      // Note: authService.decodeJWT is not exported, but we can test via setSession
    })
  })

  describe('setSession', () => {
    it('stores token and user in localStorage', () => {
      const token = 'header.payload.signature'
      // We test via loginWithCredentials which calls setSession
    })
  })

  describe('authService.isAuthenticated', () => {
    it('returns true when valid token exists', () => {
      const token = createMockToken({ exp: Date.now() / 1000 + 3600 })
      localStorage.setItem('token', token)
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('returns false when token is expired', () => {
      const token = createMockToken({ exp: Date.now() / 1000 - 3600 })
      localStorage.setItem('token', token)
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('returns false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('authService.isAdmin', () => {
    it('returns true for ADMIN role', () => {
      const token = createMockToken({ roles: ['ADMIN'] })
      localStorage.setItem('token', token)
      authService.getCurrentUser(true) // to hydrate
      expect(authService.isAdmin()).toBe(true)
    })

    it('returns true for SUPER_ADMIN role', () => {
      const token = createMockToken({ roles: ['SUPER_ADMIN'] })
      localStorage.setItem('token', token)
      authService.getCurrentUser(true)
      expect(authService.isAdmin()).toBe(true)
    })

    it('returns false for USER role', () => {
      const token = createMockToken({ roles: ['USER'] })
      localStorage.setItem('token', token)
      authService.getCurrentUser(true)
      expect(authService.isAdmin()).toBe(false)
    })
  })

  describe('authService.isSuperAdmin', () => {
    it('returns true for SUPER_ADMIN', () => {
      const token = createMockToken({ roles: ['SUPER_ADMIN'] })
      localStorage.setItem('token', token)
      authService.getCurrentUser(true)
      expect(authService.isSuperAdmin()).toBe(true)
    })

    it('returns false for ADMIN', () => {
      const token = createMockToken({ roles: ['ADMIN'] })
      localStorage.setItem('token', token)
      authService.getCurrentUser(true)
      expect(authService.isSuperAdmin()).toBe(false)
    })
  })

  describe('loginWithCredentials', () => {
    it('calls apiClient.post and sets session', async () => {
      const mockData = {
        accessToken: createMockToken({ sub: '123', email: 'test@test.com', roles: ['USER'] }),
        refreshToken: 'refresh-token',
        user: { id: '123', email: 'test@test.com', role: 'USER' },
      }
      // Mock apiClient.post
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({
        accessToken: createMockToken({ sub: '123', email: 'test@test.com', roles: ['USER'] }),
        refreshToken: 'refresh-token',
        user: { id: '123', email: 'test@test.com', role: 'USER' },
      })

      const result = await authService.loginWithCredentials('test@test.com', 'password123')

      expect(result.email).toBe('test@test.com')
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token')
    })
  })

  describe('logout', () => {
    it('clears tokens and redirects to login', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true })
      global.fetch = mockFetch

      localStorage.setItem('token', 'test-token')
      localStorage.setItem('refreshToken', 'refresh-token')

      await authService.logout()

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(window.location.href).toContain('/login')
    })
  })

  describe('register', () => {
    it('calls apiClient.post with correct data', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({})

      await authService.register('John Doe', 'john@test.com', 'password123', 'COMP-001')

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', expect.objectContaining({
        email: 'john@test.com',
        password: 'password123',
        username: expect.any(String),
        companyCode: 'COMP-001',
      }))
    })
  })

  describe('refreshToken', () => {
    it('calls refresh endpoint and updates session', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({
        accessToken: createMockToken({ sub: '123', email: 'test@test.com', roles: ['USER'] }),
        refreshToken: 'new-refresh-token',
        user: { id: '123', email: 'test@test.com', role: 'USER' },
      })

      localStorage.setItem('refreshToken', 'refresh-token')

      const result = await authService.refreshToken()

      expect(result.email).toBe('test@test.com')
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token')
    })
  })

  describe('forgotPassword', () => {
    it('calls apiClient.post', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({})

      await authService.forgotPassword('test@test.com')

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', { email: 'test@test.com' })
    })
  })

  describe('verifyCode', () => {
    it('calls apiClient.post', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({})

      await authService.verifyCode('test@test.com', '123456')

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/verify-code', { email: 'test@test.com', code: '123456' })
    })
  })

  describe('resetPassword', () => {
    it('calls apiClient.post', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({})

      await authService.resetPassword('test@test.com', '123456', 'newPassword123')

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', { email: 'test@test.com', code: '123456', newPassword: 'newPassword123' })
    })
  })

  describe('changePassword', () => {
    it('calls apiClient.post', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.post.mockResolvedValueOnce({})

      await authService.changePassword('oldPass', 'newPass')

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/change-password', { currentPassword: 'oldPass', newPassword: 'newPass' })
    })
  })

  describe('deleteAccount', () => {
    it('calls apiClient.deleteWithBody', async () => {
      const { default: apiClient } = await import('../../../shared/services/apiClient')
      apiClient.deleteWithBody.mockResolvedValueOnce({})

      await authService.deleteAccount('password123')

      expect(apiClient.deleteWithBody).toHaveBeenCalledWith('/api/v1/auth/account', { password: 'password123' })
    })
  })

  describe('getUser', () => {
    it('returns null before the session is hydrated', async () => {
      // Módulo fresco: los tests anteriores hidrataron el currentUser del
      // módulo ya importado y este caso debe ver el estado inicial.
      vi.resetModules()
      const fresh = (await import('../../../modules/auth/services/authService')).default
      expect(fresh.getUser()).toBeNull()
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

// Helper to create mock JWT
function createMockToken(payload = {}) {
  const defaultPayload = {
    sub: '123',
    email: 'test@test.com',
    username: 'testuser',
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  }
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(defaultPayload))
  return `${header}.${body}.signature`
}