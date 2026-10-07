import { useEffect, useState } from 'react';
import authService from '../modules/auth/services/authService';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const me = await authService.getCurrentUser(true);
    setUser(me);
    setLoading(false);
    return me;
  };

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const me = await authService.getCurrentUser(true);
      if (active) {
        setUser(me);
        setLoading(false);
      }
    };

    hydrate();

    const handler = () => {
      hydrate();
    };
    window.addEventListener('eduaircontrol:auth', handler);
    return () => {
      active = false;
      window.removeEventListener('eduaircontrol:auth', handler);
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: String(user?.role || '').toUpperCase() === 'ADMIN',
    refresh,
    logout: () => authService.logout(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
