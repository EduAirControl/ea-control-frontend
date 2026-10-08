import apiClient from '../../../shared/services/apiClient'
import storage from '../../../shared/storage/storage'

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
 * ms-security emite `roles` como array ("roles":["ADMIN"]), no `role` como string.
 * Leer `role` dejaba a todos los ADMIN sin permisos y ocultaba la pestana
 * Administracion, con ella el alta de dispositivos.
 */
function rolesOf(claims) {
  if (!claims) return []
  if (Array.isArray(claims.roles) && claims.roles.length) return claims.roles
  if (claims.roles) return [claims.roles]
  return []
}

function userFromClaims(claims, fallback) {
  const roles = rolesOf(claims)
  return {
    // `sub` es el UUID del usuario, no el correo; el correo va en su propio claim.
    id: claims?.sub || null,
    email: claims?.email || fallback?.email || '',
    name: claims?.name || claims?.preferred_username || claims?.username || fallback?.email || '',
    roles,
    // Se guarda el rol mas alto como singular para no romper los consumidores
    // existentes, que comparan con 'ADMIN'.
    role: roles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : roles[0] || 'USER',
    institutionId: claims?.institutionId || null,
    campusId: claims?.campusId || null,
  }
}

async function persistSession(data, fallback) {
  // ms-security devuelve accessToken; el monolito usaba `token`. Se acepta ambos
  // porque el contrato de ms-security es el vigente.
  const token = data.accessToken || data.token
  if (!token) throw new Error('login response has no accessToken')

  await storage.setItem('token', token)
  if (data.refreshToken) await storage.setItem('refreshToken', data.refreshToken)

  const user = userFromClaims(decodeJWT(token), fallback)
  await storage.setItem('user', JSON.stringify(user))
  return { ...data, token, user }
}

const authService = {
  async login(email, password) {
    // companyCode pertenece al registro de usuario, no al login de ms-security.
    const data = await apiClient.post('/api/v1/auth/login', { email, password })
    return persistSession(data, { email })
  },

  async register(payload) {
    const data = await apiClient.post('/api/v1/auth/register', payload)
    return persistSession(data, { email: payload.email })
  },

  async logout() {
    // El logout del servidor es best-effort: si falla igual hay que limpiar local.
    try {
      await apiClient.post('/api/v1/auth/logout', {})
    } catch {
      // ignorado a proposito
    }
    await storage.removeItem('token')
    await storage.removeItem('refreshToken')
    await storage.removeItem('user')
  },

  forgotPassword(email) {
    return apiClient.post('/api/v1/auth/forgot-password', { email })
  },

  verifyCode(email, code) {
    return apiClient.post('/api/v1/auth/verify-code', { email, code })
  },

  resendCode(email) {
    return apiClient.post('/api/v1/auth/resend-code', { email })
  },

  resetPassword(email, code, newPassword) {
    return apiClient.post('/api/v1/auth/reset-password', { email, code, newPassword })
  },

  changePassword(currentPassword, newPassword) {
    return apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword })
  },

  getToken() {
    return storage.getItem('token')
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
      this.logout()
      return false
    }
    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
      this.logout()
      return false
    }
    return true
  },

  isAdmin() {
    if (!this.isAuthenticated()) return false
    const user = this.getUser()
    const roles = user?.roles?.length ? user.roles : rolesOf(decodeJWT(this.getToken()))
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(String(r).toUpperCase()))
  },

  isSuperAdmin() {
    if (!this.isAuthenticated()) return false
    const user = this.getUser()
    const roles = user?.roles?.length ? user.roles : rolesOf(decodeJWT(this.getToken()))
    return roles.some((r) => String(r).toUpperCase() === 'SUPER_ADMIN')
  },
}

export default authService