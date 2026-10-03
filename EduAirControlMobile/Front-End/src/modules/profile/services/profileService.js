import apiClient from '../../../shared/services/apiClient'
import authService from '../../auth/services/authService'

const BASE = '/api/v1/profile'

const EMPTY = { fullName: '', email: '', title: '', phone: '', location: '', avatar: null }

const profileService = {
  async get() {
    const jwtUser = authService.getUser()
    if (!jwtUser) return EMPTY
    try {
      const remote = await apiClient.get(BASE)
      return { ...EMPTY, ...remote, email: remote.email || jwtUser.email }
    } catch {
      return {
        ...EMPTY,
        fullName: jwtUser.name || '',
        email: jwtUser.email || '',
      }
    }
  },

  async save(profile) {
    return apiClient.put(BASE, {
      fullName: profile.fullName,
      title: profile.title,
      phone: profile.phone,
      location: profile.location,
      avatar: profile.avatar,
    })
  },
}

export default profileService
