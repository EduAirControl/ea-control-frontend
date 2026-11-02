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

/**
 * Resultado de un intento de renovación:
 * - `'ok'`       → renovado, se puede reintentar la petición original.
 * - `'rejected'` → el backend rechazó el refresh token: la sesión ya no sirve
 *                  (venció, se revirtió o ya se usó). Sí hay que limpiar.
 * - `'error'`    → fallo transitorio (red, 5xx): **no** se destruye la sesión,
 *                  un apagón no debe obligar a volver a entrar.
 */
async function doRefresh() {
  const refreshToken = storage.getItem('refreshToken')
  if (!refreshToken) return 'rejected'
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return res.status === 401 || res.status === 403 ? 'rejected' : 'error'
    const data = await res.json()
    if (!data?.accessToken) return 'error'
    await storage.setItem('token', data.accessToken)
    if (data.refreshToken) await storage.setItem('refreshToken', data.refreshToken)
    return 'ok'
  } catch {
    return 'error'
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
  // Solo se reintenta con éxito real; el resultado se guarda para decidir más
  // abajo si la sesión se destruye o no.
  let refreshOutcome = null
  if (response.status === 401 && token && !PUBLIC_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p))) {
    refreshOutcome = await tryRefreshToken()
    if (refreshOutcome === 'ok') {
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
      // 'error' = fallo transitorio (red/5xx al renovar). La sesión sigue siendo
      // válida en el backend: no se borra y no se manda al login. Solo se limpia
      // cuando el refresh fue rechazado o no había nada con lo que renovar.
      if (refreshOutcome !== 'error') {
        await clearSession()
        onUnauthorized?.()
      }
      const sessionError = new Error(
        error.message || i18n.t(refreshOutcome === 'error' ? 'errors.network' : 'errors.sessionExpired')
      )
      // Marcado para que la capa de UI sepa que es un fin de sesión real (ya
      // navega al login) y no tenga que toastear además el mensaje.
      sessionError.sessionExpired = refreshOutcome !== 'error'
      throw sessionError
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
