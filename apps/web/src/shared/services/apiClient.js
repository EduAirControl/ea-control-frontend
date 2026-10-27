const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8080`;

const PUBLIC_PATHS = [
  '/landing',
  '/guide',
  '/terms',
  '/login',
  '/forgot-password',
  '/verify-code',
  '/change-password',
];

function clearToken() {
  // No-op with cookie-based auth; tokens are in HttpOnly cookies
  localStorage.removeItem('user');
}

function handleUnauthorized() {
  if (PUBLIC_PATHS.some((path) => window.location.pathname.startsWith(path))) return;
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('eduaircontrol:auth'));
  window.location.assign('/login');
}

function messageFor(status, body) {
  if (body?.message) return body.message;
  switch (status) {
    case 400:
      return 'Datos inválidos';
    case 401:
      return 'Sesión expirada o credenciales inválidas';
    case 403:
      return 'No tienes permiso para esta acción';
    case 404:
      return 'Recurso no encontrado';
    case 409:
      return 'El recurso ya existe';
    case 429:
      return 'Demasiadas solicitudes, intenta más tarde';
    case 500:
      return 'Error del servidor';
    default:
      return `Error ${status}`;
  }
}

function buildUrl(endpoint, params) {
  if (!params) return endpoint;
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  if (!query) return endpoint;
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Always send cookies (HttpOnly access/refresh tokens)
  const fetchOptions = { ...options, headers, credentials: 'include' };

  let response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  if (response.status === 401 && endpoint !== '/api/v1/me' && !PUBLIC_PATHS.some((p) => endpoint.startsWith(p))) {
    // Try to refresh via cookie (BFF handles refresh)
    try {
      const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
      } else {
        handleUnauthorized();
        throw new Error(messageFor(401, null));
      }
    } catch {
      handleUnauthorized();
      throw new Error(messageFor(401, null));
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !PUBLIC_PATHS.some((p) => endpoint.startsWith(p))) {
      handleUnauthorized();
    }
    throw new Error(messageFor(response.status, body));
  }

  if (response.status === 204) return null;
  return response.json();
}

const apiClient = {
  get: (endpoint, options = {}) => request(buildUrl(endpoint, options.params), options),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  deleteWithBody: (endpoint, body) =>
    request(endpoint, { method: 'DELETE', body: JSON.stringify(body) }),
  request,
};

export { API_BASE, clearToken, buildUrl };
export default apiClient;
