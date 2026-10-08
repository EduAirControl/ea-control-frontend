import { API_BASE } from '../config'
import storage from '../storage/storage'
import i18n from '../i18n/i18n'

// Rutas de acceso publico: un 401 aqui significa "credenciales malas", no
// "sesion vencida", y no debe cerrar la sesion ni intentar refrescar.
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/verify-code',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/resend-code',
]

let onUnauthorized = null

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

function getToken() {
  return storage.getItem('token')
}

function getRefreshToken() {
  return storage.getItem('refreshToken')
}

/**
 * Refresco del access token.
 *
 * ms-security rota el refresh token en cada uso (`reuseRefreshTokens(false)`),
 * asi que hay que guardar el nuevo: conservar el viejo lo deja inutilizable.
 * Un solo reintento concurrente, con la promesa compartida, porque el aprovisionamiento
 * BLE dispara varias peticiones a la vez y refrescar cuatro veces seguidas
 * invalidaria el token recien emitido.
 */
let refreshInFlight = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) return false

      const data = await response.json().catch(() => ({}))
      const accessToken = data.accessToken
      if (!accessToken) return false

      await storage.setItem('token', accessToken)
      if (data.refreshToken) await storage.setItem('refreshToken', data.refreshToken)
      return true
    })().finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

async function request(endpoint, options = {}, { retryOn401 = true } = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
  } catch {
    throw new Error(i18n.t('errors.network'))
  }

  if (response.status === 401 && token && retryOn401 && !isPublicAuth(endpoint)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request(endpoint, options, { retryOn401: false })
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p))
    if (response.status === 401 && !isPublicAuth) {
      await storage.removeItem('token')
      await storage.removeItem('refreshToken')
      await storage.removeItem('user')
      onUnauthorized?.()
      throw Object.assign(new Error(error.message || i18n.t('errors.sessionExpired')), {
        status: response.status,
      })
    }

    // El status va en la excepcion: el mensaje del backend es texto libre y no
    // permite distinguir, por ejemplo, un 409 de alta duplicada de otro 409.
    throw Object.assign(new Error(error.message || `Error ${response.status}`), {
      status: response.status,
      body: error,
    })
  }

  if (response.status === 204) return null
  return response.json()
}

function isPublicAuth(endpoint) {
  return PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p))
}

const apiClient = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  // Necesario para /api/v1/auth/refresh, que se llama desde apiClient y no
  // puede pasar por request() sin entrar en recursion.
  getBaseUrl: () => API_BASE,
  getRefreshToken,
}

export default apiClient