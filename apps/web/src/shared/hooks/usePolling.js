import { useEffect, useRef } from 'react';

/**
 * Ejecuta `callback` cada `intervalMs` mientras la pestaña está visible.
 *
 * <p>No se ejecuta al montar (el fetch inicial lo hace cada pantalla con su
 * propio `useEffect`), pero sí en cuanto la pestaña vuelve a estar visible,
 * para refrescar sin esperar al siguiente tick. Con la pestaña oculta el
 * timer no peta nada.
 */
export function usePolling(callback, intervalMs = 10000) {
  const savedRef = useRef(callback);

  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') savedRef.current();
    };
    const interval = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
}
