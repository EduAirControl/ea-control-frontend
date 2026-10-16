import { useState, useEffect, useCallback } from 'react';
import { EnvironmentContext } from './useEnvironment';
import environmentService from '../modules/environment/services/environmentService';
import authService from '../modules/auth/services/authService';
import { useToast } from '../shared/hooks/useToast';

export function EnvironmentProvider({ children }) {
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const loadEnvironments = useCallback(async () => {
    // Un access token vencido no debe vaciar la lista: se intenta renovar con el
    // refresh token y solo se limpia si ya no hay sesión real. Antes el chequeo
    // síncrono de expiración vaciaba los ambientes "al volver a la pestaña" y
    // solo se veían de nuevo tras recargar la página.
    if (!authService.isAuthenticated()) {
      let renewed = false;
      try {
        renewed = Boolean(await authService.refreshToken());
      } catch {
        renewed = false;
      }
      if (!renewed) {
        setEnvironments([]);
        setError(null);
        setLoading(false);
        return;
      }
    }
    try {
      const data = await environmentService.getAll();
      setEnvironments(data);
      setError(null);
    } catch (err) {
      // Solo se registra el error: los datos ya cargados se conservan.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadEnvironments();
    };
    window.addEventListener('eduaircontrol:auth', loadEnvironments);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('eduaircontrol:auth', loadEnvironments);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadEnvironments]);

  const toggleFavorite = async (id) => {
    const snapshot = environments;
    const target = environments.find((env) => env.id === id);
    const newValue = target ? !target.isFavorite : false;
    setEnvironments((prev) =>
      prev.map((env) => (env.id === id ? { ...env, isFavorite: newValue } : env))
    );
    try {
      const isFavorite = await environmentService.toggleFavorite(id);
      setEnvironments((prev) =>
        prev.map((env) => (env.id === id ? { ...env, isFavorite } : env))
      );
      setError(null);
    } catch (err) {
      setEnvironments(snapshot);
      setError(err.message);
      toast.error(err.message);
    }
  };

  const addEnvironment = async (data) => {
    try {
      const newEnv = await environmentService.create(data);
      setEnvironments((prev) => [...prev, newEnv]);
      setError(null);
      return newEnv;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const editEnvironment = async (id, data) => {
    const snapshot = environments;
    setEnvironments((prev) =>
      prev.map((env) => (env.id === id ? { ...env, ...data } : env))
    );
    try {
      const updated = await environmentService.update(id, data);
      setEnvironments((prev) =>
        prev.map((env) => (env.id === id ? { ...env, ...updated } : env))
      );
      setError(null);
      return updated;
    } catch (err) {
      setEnvironments(snapshot);
      setError(err.message);
      throw err;
    }
  };

  const deleteEnvironment = async (id) => {
    const snapshot = environments;
    setEnvironments((prev) => prev.filter((env) => env.id !== id));
    try {
      await environmentService.delete(id);
      setError(null);
    } catch (err) {
      setEnvironments(snapshot);
      setError(err.message);
      throw err;
    }
  };

  // Memoizado: los consumers (dashboard, gestión) montan un setInterval con
  // esta función como dependencia; sin useCallback el intervalo se recrearía
  // en cada render del provider y el polling no tendría cadencia estable.
  const refreshEnvironments = useCallback(() => loadEnvironments(), [loadEnvironments]);

  return (
    <EnvironmentContext.Provider
      value={{
        environments,
        loading,
        error,
        toggleFavorite,
        addEnvironment,
        editEnvironment,
        deleteEnvironment,
        refreshEnvironments,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}
