import apiClient, { clearSession } from '../../../shared/services/apiClient'
import storage from '../../../shared/storage/storage'

const BASE = '/api/v1/auth'

function base64UrlDecode(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(base64UrlDecode(payload))
  } catch {
    return null
  }
}

/**
 * Guarda la sesión con la forma real de la respuesta de ms-security:
 * `{ accessToken, refreshToken, expiresIn, user }` (antes se leía `data.token`,
 * que el backend no devuelve nunca, y el rol salía de `claims.role` cuando el
 * token lleva `roles[]`).
 */
async function storeSession(data) {
  if (!data?.accessToken) throw new Error('Respuesta de autenticación inválida')
  await storage.setItem('token', data.accessToken)
  if (data.refreshToken) await storage.setItem('refreshToken', data.refreshToken)

  const claims = decodeJWT(data.accessToken) || {}
  const summary = data.user || {}
  const roles = Array.isArray(summary.roles) && summary.roles.length
    ? summary.roles
    : (Array.isArray(claims.roles) ? claims.roles : (claims.role ? [claims.role] : []))

  const user = {
    id: summary.id || claims.userId || claims.sub || null,
    email: summary.email || claims.email || null,
    username: summary.username || claims.username || null,
    roles,
    role: roles[0] || 'USER',
    institutionId: summary.institutionId || claims.institutionId || null,
    campusId: summary.campusId || claims.campusId || null,
  }
  await storage.setItem('user', JSON.stringify(user))
  return user
}

const authService = {
  /** `LoginRequest` es solo `{email, password}`: el `companyCode` lo ignora el backend. */
  async login(email, password) {
    const data = await apiClient.post(`${BASE}/login`, { email, password })
    return storeSession(data)
  },

  /** `RegisterRequest`: `{email, password, username, companyCode, campusId?}`. */
  async register(name, email, password, companyCode, campusId) {
    const data = await apiClient.post(`${BASE}/register`, {
      email,
      password,
      username: name,
      companyCode,
      ...(campusId ? { campusId } : {}),
    })
    return storeSession(data)
  },

  async refresh() {
    const refreshToken = storage.getItem('refreshToken')
    if (!refreshToken) return false
    const data = await apiClient.post(`${BASE}/refresh`, { refreshToken })
    await storeSession(data)
    return true
  },

  async logout() {
    const refreshToken = storage.getItem('refreshToken')
    // Mejor esfuerzo: si el backend no responde, la sesión local se limpia igual.
    try {
      await apiClient.post(`${BASE}/logout`, { refreshToken, allDevices: false })
    } catch {
      // ignorado a propósito
    }
    await clearSession()
  },

  async forgotPassword(email) {
    return apiClient.post(`${BASE}/forgot-password`, { email })
  },

  async verifyCode(email, code) {
    return apiClient.post(`${BASE}/verify-code`, { email, code })
  },

  async resendCode(email) {
    return apiClient.post(`${BASE}/resend-code`, { email })
  },

  async resetPassword(email, code, newPassword) {
    return apiClient.post(`${BASE}/reset-password`, { email, code, newPassword })
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post(`${BASE}/change-password`, { currentPassword, newPassword })
  },

  async deleteAccount() {
    await apiClient.delete(`${BASE}/account`)
    await clearSession()
  },

  getToken() {
    return storage.getItem('token')
  },

  getRefreshToken() {
    return storage.getItem('refreshToken')
  },

  getUser() {
    try {
      return JSON.parse(storage.getItem('user'))
    } catch {
      return null
    }
  },

  isAuthenticated() {
    const token = storage.getItem('token')
    if (!token) return false
    const claims = decodeJWT(token)
    if (!claims) {
      clearSession()
      return false
    }
    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
      clearSession()
      return false
    }
    return true
  },

  /**
   * Los roles viajan como lista en `roles`. Se acepta `role` (string) por si
   * llegara un token antiguo.
   */
  roles() {
    const user = this.getUser()
    if (user?.roles?.length) return user.roles
    const claims = decodeJWT(this.getToken()) || {}
    if (Array.isArray(claims.roles)) return claims.roles
    return claims.role ? [claims.role] : []
  },

  isAdmin() {
    return this.roles().some((r) => String(r).toUpperCase() === 'ADMIN')
  },

  isSuperAdmin() {
    return this.roles().some((r) => String(r).toUpperCase() === 'SUPER_ADMIN')
  },
}

export default authService
