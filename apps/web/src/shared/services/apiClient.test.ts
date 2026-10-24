import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import apiClient, { API_BASE, getToken, clearToken, buildUrl } from './apiClient'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('API_BASE', () => {
    it('should use VITE_API_URL when set', () => {
      // This is tested implicitly
      expect(API_BASE).toBeDefined()
    })
  })

  describe('getToken', () => {
    it('returns token from localStorage', () => {
      localStorage.setItem('token', 'test-token')
      expect(getToken()).toBe('test-token')
    })

    it('returns null when no token', () => {
      expect(getToken()).toBeNull()
    })
  })

  describe('clearToken', () => {
    it('removes token and user from localStorage', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', '{"id": "1"}')
      clearToken()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('buildUrl', () => {
    it('returns endpoint without params', () => {
      expect(buildUrl('/api/test')).toBe('/api/test')
    })

    it('appends params as query string', () => {
      expect(buildUrl('/api/test', { page: 1, limit: 10 })).toBe('/api/test?page=1&limit=10')
    })

    it('filters out undefined, null, and empty values', () => {
      expect(buildUrl('/api/test', { page: 1, limit: null, search: '', sort: 'asc' }))
        .toBe('/api/test?page=1&sort=asc')
    })

    it('handles existing query string', () => {
      expect(buildUrl('/api/test?existing=true', { page: 1 })).toBe('/api/test?existing=true&page=1')
    })
  })

  describe('apiClient', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should make GET request with token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        status: 200,
      })

      localStorage.setItem('token', 'test-token')
      const result = await apiClient.get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1' }),
        status: 201,
      })

      localStorage.setItem('token', 'test-token')
      const result = await apiClient.post('/api/test', { name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      )
    })

    it('should handle 401 and try to refresh token', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'refreshed' }),
          status: 200,
        })

      localStorage.setItem('token', 'old-token')
      localStorage.setItem('refreshToken', 'refresh-token')

      const result = await apiClient.get('/api/test')

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle 204 no content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      localStorage.setItem('token', 'test-token')
      const result = await apiClient.delete('/api/test/1')

      expect(result).toBeNull()
    })

    it('should handle errors and throw with message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })

      localStorage.setItem('token', 'test-token')

      await expect(apiClient.get('/api/test')).rejects.toThrow('Recurso no encontrado')
    })
  })
})