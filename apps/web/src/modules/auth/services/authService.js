import apiClient, { API_BASE } from '../../../shared/services/apiClient';

const RESET_EMAIL_KEY = 'resetEmail';
const AUTH_EVENT = 'eduaircontrol:auth';

let currentUser = null;

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/**
 * Autenticación vía BFF (ADR-017): el SPA no maneja tokens. El login redirige al
 * gateway (Authorization Code + PKCE) y la sesión vive en una cookie httpOnly.
 */
const authService = {
  async getCurrentUser(force = false) {
    if (currentUser && !force) return currentUser;
    try {
      const me = await apiClient.get('/api/v1/me');
      currentUser = {
        id: me.userId || null,
        email: me.email || '',
        role: me.role || 'USER',
        name: (me.email || '').split('@')[0],
        institutionId: me.institutionId || null,
        campusId: me.campusId || null,
      };
    } catch {
      currentUser = null;
    }
    return currentUser;
  },

  login() {
    window.location.assign(`${API_BASE}/oauth2/authorization/web`);
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    currentUser = null;
    notifyAuthChanged();
    window.location.assign('/login');
  },

  async register(name, email, password, companyCode) {
    return apiClient.post('/api/v1/auth/register', {
      name,
      email,
      password,
      username: (name || email.split('@')[0]).trim().slice(0, 100),
      companyCode,
    });
  },

  async forgotPassword(email) {
    return apiClient.post('/api/v1/auth/forgot-password', { email });
  },

  async verifyCode(email, code) {
    return apiClient.post('/api/v1/auth/verify-code', { email, code });
  },

  async resetPassword(email, code, newPassword) {
    return apiClient.post('/api/v1/auth/reset-password', { email, code, newPassword });
  },

  async resendCode(email) {
    return apiClient.post('/api/v1/auth/resend-code', { email });
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword });
  },

  async deleteAccount(password) {
    return apiClient.deleteWithBody('/api/v1/auth/account', { password });
  },

  setResetEmail(email) {
    sessionStorage.setItem(RESET_EMAIL_KEY, email);
  },

  getResetEmail() {
    return sessionStorage.getItem(RESET_EMAIL_KEY) || '';
  },

  clearResetEmail() {
    sessionStorage.removeItem(RESET_EMAIL_KEY);
  },

  getUser() {
    return currentUser;
  },

  isAuthenticated() {
    return Boolean(currentUser);
  },

  isAdmin() {
    return String(currentUser?.role || '').toUpperCase() === 'ADMIN';
  },
};

export default authService;
