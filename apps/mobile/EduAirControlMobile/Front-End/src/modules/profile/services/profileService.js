import apiClient from '../../../shared/services/apiClient'
import authService from '../../auth/services/authService'

/**
 * Perfil de usuario (ms-user-management).
 *
 * <p>El backend expone `/api/v1/users/by-user/{userId}` para leer y
 * `/api/v1/users/{id}` para actualizar. La UI usa `title`/`location`, que se
 * mapean a `position`/`department` (igual que la web): el port móvil perdió ese
 * mapeo y los campos no se guardaban.
 */
const BASE = '/api/v1/users'

const EMPTY = {
  id: null,
  fullName: '',
  email: '',
  title: '',
  phone: '',
  location: '',
  avatarUrl: '',
}

function toUi(remote, fallbackEmail) {
  if (!remote) return { ...EMPTY, email: fallbackEmail || '' }
  return {
    id: remote.id ?? null,
    fullName: remote.fullName || '',
    email: fallbackEmail || '',
    title: remote.position || '',
    phone: remote.phone || '',
    location: remote.department || '',
    avatarUrl: remote.avatarUrl || '',
  }
}

const profileService = {
  async get() {
    const user = authService.getUser()
    const email = user?.email || ''
    const userId = user?.id
    if (!userId) return { ...EMPTY, email }
    try {
      const remote = await apiClient.get(`${BASE}/by-user/${encodeURIComponent(userId)}`)
      return toUi(remote, email)
    } catch {
      // Sin perfil todavía: se devuelve el hueco y la UI lo permite editar.
      return { ...EMPTY, email }
    }
  },

  async save(profile) {
    const user = authService.getUser()
    const email = user?.email || ''
    const payload = {
      fullName: profile.fullName,
      position: profile.title,
      phone: profile.phone,
      department: profile.location,
      avatarUrl: profile.avatarUrl || '',
    }
    if (!user?.id) throw new Error('Sesión inválida: usuario sin id')

    // Si el perfil ya existe se actualiza (PUT). Solo se crea (POST) si
    // realmente no hay perfil: un POST repetido responde 409 y el guardado
    // se perdía silenciosamente.
    let profileId = profile.id || null
    if (!profileId) {
      try {
        const existing = await apiClient.get(`${BASE}/by-user/${encodeURIComponent(user.id)}`)
        profileId = existing?.id || null
      } catch {
        profileId = null
      }
    }

    if (profileId) {
      const saved = await apiClient.put(`${BASE}/${encodeURIComponent(profileId)}`, payload)
      return toUi(saved, email)
    }

    const created = await apiClient.post(BASE, { ...payload, userId: user.id })
    return toUi(created, email)
  },
}

export default profileService
