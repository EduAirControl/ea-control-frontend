import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient, { API_BASE, clearToken, buildUrl } from './apiClient'

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
    it('should be defined', () => {
      expect(API_BASE).toBeDefined()
    })
  })

  describe('clearToken', () => {
    it('removes the cached user from localStorage', () => {
      localStorage.setItem('user', '{"id": "1"}')
      clearToken()
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

    it('sends requests with credentials included', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        status: 200,
      })

      const result = await apiClient.get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({ credentials: 'include' })
      )
      expect(result).toEqual({ data: 'test' })
    })

    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1' }),
        status: 201,
      })

      const result = await apiClient.post('/api/test', { name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
          credentials: 'include',
        })
      )
      expect(result).toEqual({ id: '1' })
    })

    it('handles 401 by refreshing via cookie and retrying', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'refreshed' }),
        })

      const result = await apiClient.get('/api/test')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ data: 'refreshed' })
    })

    it('handles 204 no content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await apiClient.delete('/api/test/1')

      expect(result).toBeNull()
    })

    it('throws with a mapped message on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })

      await expect(apiClient.get('/api/test')).rejects.toThrow('Recurso no encontrado')
    })

    it('sends params as query string on GET', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })

      await apiClient.get('/api/test', { params: { page: 1, limit: 10 } })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test?page=1&limit=10'),
        expect.any(Object)
      )
    })
  })
})
