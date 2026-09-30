import apiClient from '../../../shared/services/apiClient'
import storage from '../../../shared/storage/storage'

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const authService = {
  async login(email, password, companyCode) {
    const data = await apiClient.post('/auth/login', { email, password, companyCode })
    await storage.setItem('token', data.token)
    const claims = decodeJWT(data.token)
    const user = { email: claims?.sub || email, role: claims?.role || 'USER', name: email.split('@')[0] }
    await storage.setItem('user', JSON.stringify(user))
    return data
  },

  async register(name, email, password, companyCode) {
    const data = await apiClient.post('/auth/register', { name, email, password, companyCode })
    await storage.setItem('token', data.token)
    const claims = decodeJWT(data.token)
    const user = { email: claims?.sub || email, role: claims?.role || 'USER', name }
    await storage.setItem('user', JSON.stringify(user))
    return data
  },

  async logout() {
    await storage.removeItem('token')
    await storage.removeItem('user')
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
    const role = this.getUser()?.role || decodeJWT(this.getToken())?.role || ''
    return String(role).toUpperCase() === 'ADMIN'
  },
}

export default authService