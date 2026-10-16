import { API_BASE } from '../config'
import storage from '../storage/storage'
import i18n from '../i18n/i18n'

/**
 * Rutas públicas de autenticación: sin token y un 401 ahí no significa sesión
 * caducada. El backend las sirve bajo `/api/v1/auth/*` — antes estaban sin el
 * prefijo y la detección de sesión caducada se activaba en el propio login.
 */
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/verify-code',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/resend-code',
  '/api/v1/auth/refresh',
  '/api/v1/auth/health',
  '/api/v1/auth/jwks',
]

let onUnauthorized = null

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

function getToken() {
  return storage.getItem('token')
}

/**
 * Renueva el access token con el refresh token.
 *
 * <p>Las peticiones 401 concurrentes comparten una única renovación: el
 * backend rota el refresh token en cada uso, así que renovar N veces en
 * paralelo quema el token y deja la sesión a medias (peticiones que fallan,
 * guardados que se pierden).
 *
 * <p>Antes no existía: un 401 borraba la sesión y mandaba al login aunque el
 * usuario tuviera un refresh token válido.
 */
let refreshInFlight = null

async function doRefresh() {
  const refreshToken = storage.getItem('refreshToken')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (!data?.accessToken) return false
    await storage.setItem('token', data.accessToken)
    if (data.refreshToken) await storage.setItem('refreshToken', data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function tryRefreshToken() {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function clearSession() {
  await storage.removeItem('token')
  await storage.removeItem('refreshToken')
  await storage.removeItem('user')
}

async function request(endpoint, options = {}, baseUrl = API_BASE) {
  const { params, ...fetchOptions } = options
  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.append(key, String(value))
  })
  const queryString = query.toString()
  const url = queryString
    ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`
    : endpoint
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const doFetch = () =>
    fetch(`${baseUrl}${url}`, {
      ...fetchOptions,
      headers: { ...headers, ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    })

  let response
  try {
    response = await doFetch()
  } catch {
    throw new Error(i18n.t('errors.network'))
  }

  // Un 401 con token puede ser un access token vencido: se intenta renovar una vez.
  if (response.status === 401 && token && !PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p))) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      try {
        response = await doFetch()
      } catch {
        throw new Error(i18n.t('errors.network'))
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p))

    if (response.status === 401 && !isPublicAuth) {
      await clearSession()
      onUnauthorized?.()
      throw new Error(error.message || i18n.t('errors.sessionExpired'))
    }

    // El status se adjunta al error: sin el, un 409 (serial ya dado de alta)
    // es indistinguible de cualquier otro fallo para el llamador.
    const httpError = new Error(error.message || `Error ${response.status}`)
    httpError.status = response.status
    throw httpError
  }

  if (response.status === 204) return null
  // Un 2xx sin body (no 204) no debe romper el flujo del llamador.
  return response.json().catch(() => null)
}

const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, options),
  post: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  request,
}

export { clearSession }
export default apiClient
