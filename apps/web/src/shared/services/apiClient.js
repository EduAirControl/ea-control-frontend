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

function handleUnauthorized() {
  // Solo disparar el evento si no estamos ya en una página pública
  if (PUBLIC_PATHS.some((path) => window.location.pathname.startsWith(path))) return;
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

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      handleUnauthorized();
    }
    throw new Error(messageFor(response.status, body));
  }

  if (response.status === 204) return null;
  return response.json();
}

const apiClient = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  deleteWithBody: (endpoint, body) =>
    request(endpoint, { method: 'DELETE', body: JSON.stringify(body) }),
  request,
};

export { API_BASE };
export default apiClient;
