import { hasAnyMetric } from './environmentMetrics';

/**
 * Score de calidad 0-100 del ambiente.
 *
 * <p>Se calcula únicamente con la severidad que el backend asignó a cada
 * lectura usando los umbrales configurados del ambiente. No hay rangos fijos
 * aquí: si cambian los umbrales, cambia el score.
 *
 * <p>Sin mediciones, o sin severidades evaluables, devuelve `null` para no
 * pintar un 100 ("Excelente") en un ambiente que no ha reportado nada.
 */
export default function calculateEnvironmentScore(environment) {
  if (!hasAnyMetric(environment)) return null;

  const severities = Object.values(environment.metricSeverity || {}).filter(
    (severity) => severity === 'OK' || severity === 'WARNING' || severity === 'CRITICAL'
  );
  if (severities.length === 0) return null;

  let score = 100;

  for (const severity of severities) {
    if (severity === 'CRITICAL') score -= 25;
    else if (severity === 'WARNING') score -= 10;
  }

  return Math.max(score, 0);
}
