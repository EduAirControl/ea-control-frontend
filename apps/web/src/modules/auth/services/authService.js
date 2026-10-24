import apiClient, { API_BASE, clearToken } from '../../../shared/services/apiClient';

const RESET_EMAIL_KEY = 'resetEmail';
const AUTH_EVENT = 'eduaircontrol:auth';

let currentUser = null;

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

const authService = {
  async getCurrentUser(force = false) {
    if (currentUser && !force) return currentUser;

    try {
      const me = await apiClient.get('/api/v1/me');
      currentUser = {
        id: me.userId || null,
        email: me.email || '',
        role: me.role || 'USER',
        roles: me.roles || (me.role ? [me.role] : []),
        name: (me.email || '').split('@')[0],
        institutionId: me.institutionId || null,
        campusId: me.campusId || null,
      };
    } catch {
      currentUser = null;
    }
    return currentUser;
  },

  async loginWithCredentials(email, password) {
    const data = await apiClient.post('/api/v1/auth/login', { email, password });
    // Token is in HttpOnly cookie; just set user session
    currentUser = {
      id: data.user?.userId || null,
      email: data.user?.email || '',
      role: data.user?.role || 'USER',
      roles: data.user?.roles || [data.user?.role || 'USER'],
      name: data.user?.username || data.user?.name || (data.user?.email || '').split('@')[0],
      institutionId: data.user?.institutionId || null,
      campusId: data.user?.campusId || null,
    };
    localStorage.setItem('user', JSON.stringify(currentUser));
    window.dispatchEvent(new Event('eduaircontrol:auth'));
    return currentUser;
  },

  loginWithOAuth2() {
    window.location.assign(`${API_BASE}/oauth2/authorization/web`);
  },

  async exchangeSocialCode(code) {
    const data = await apiClient.post('/api/v1/auth/oauth2/social/exchange', { code });
    currentUser = {
      id: data.user?.userId || null,
      email: data.user?.email || '',
      role: data.user?.role || 'USER',
      roles: data.user?.roles || [data.user?.role || 'USER'],
      name: data.user?.username || data.user?.name || (data.user?.email || '').split('@')[0],
      institutionId: data.user?.institutionId || null,
      campusId: data.user?.campusId || null,
    };
    localStorage.setItem('user', JSON.stringify(currentUser));
    window.dispatchEvent(new Event('eduaircontrol:auth'));
    return { needsOnboarding: Boolean(data.needsOnboarding) };
  },

  async completeSocialOnboarding(companyCode) {
    return apiClient.post('/api/v1/auth/oauth2/onboarding', { companyCode });
  },

  async refreshToken() {
    // Refresh is handled by BFF via cookie; just re-hydrate user
    return this.getCurrentUser(true);
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
      localStorage.removeItem('user');
      currentUser = null;
      window.location.assign('/login');
    }
  },

  async register(name, email, password, companyCode) {
    return apiClient.post('/api/v1/auth/register', {
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
    return String(currentUser?.role || '').toUpperCase() === 'ADMIN'
      || String(currentUser?.role || '').toUpperCase() === 'SUPER_ADMIN';
  },

  isSuperAdmin() {
    return String(currentUser?.role || '').toUpperCase() === 'SUPER_ADMIN';
  },
};

export default authService;
