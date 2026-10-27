import { describe, it, expect, vi, beforeEach } from 'vitest'
import preferencesService, { DEFAULT_REMINDERS } from '../../../modules/settings/services/preferencesService'
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

describe('preferencesService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('exports the default reminders', () => {
    expect(DEFAULT_REMINDERS).toEqual({
      alertas: true,
      advertencias: true,
      resumenDiario: false,
      sonido: true,
    })
  })

  it('get returns null when the backend has no preference', async () => {
    mockApi.get.mockResolvedValue(null)
    expect(await preferencesService.get()).toBeNull()
  })

  it('get returns null when the backend call fails', async () => {
    mockApi.get.mockRejectedValue(new Error('down'))
    expect(await preferencesService.get()).toBeNull()
  })

  it('get normalizes timeZone/autoTimeZone into manualTimezone/autoTimezone', async () => {
    mockApi.get.mockResolvedValue({ id: 'p1', timeZone: 'America/Bogota', autoTimeZone: true })
    const result = await preferencesService.get()
    expect(result).toMatchObject({
      id: 'p1',
      timeZone: 'America/Bogota',
      autoTimeZone: true,
      manualTimezone: 'America/Bogota',
      autoTimezone: true,
    })
  })

  it('get keeps explicit manualTimezone/autoTimezone when present', async () => {
    mockApi.get.mockResolvedValue({
      manualTimezone: 'Europe/Madrid',
      autoTimezone: false,
      timeZone: 'America/Bogota',
      autoTimeZone: true,
    })
    const result = await preferencesService.get()
    expect(result?.manualTimezone).toBe('Europe/Madrid')
    expect(result?.autoTimezone).toBe(false)
  })

  it('get calls the preferences endpoint', async () => {
    mockApi.get.mockResolvedValue(null)
    await preferencesService.get()
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/preferences')
  })

  it('save returns the backend response on success', async () => {
    mockApi.put.mockResolvedValue({ id: 'p1', saved: true })
    const result = await preferencesService.save({ theme: 'dark' })
    expect(result).toEqual({ id: 'p1', saved: true })
    expect(mockApi.put).toHaveBeenCalledWith('/api/v1/preferences', { theme: 'dark' })
  })

  it('save returns null when the backend call fails', async () => {
    mockApi.put.mockRejectedValue(new Error('down'))
    expect(await preferencesService.save({ theme: 'dark' })).toBeNull()
  })
})
