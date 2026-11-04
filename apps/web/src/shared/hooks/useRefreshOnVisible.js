import { useEffect, useRef } from 'react';

/**
 * Ejecuta `callback` cada vez que la pestaña vuelve a estar visible.
 *
 * <p>Para pantallas cuyos datos solo cambian cuando el usuario los edita (perfil,
 * ajustes): se leen al montar y al regresar a la pestaña, sin consultar el
 * servidor en bucle como hace `usePolling`.
 */
export function useRefreshOnVisible(callback) {
  const savedRef = useRef(callback);

  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') savedRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
