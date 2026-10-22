import { hasAnyMetric } from './environmentMetrics';

/**
 * Score de calidad 0-100 del ambiente.
 *
 * <p>Con cero mediciones ninguna comparación se dispara y el resultado era 100
 * ("Excelente") para un ambiente que no ha reportado nada. `deriveStatusKey`
 * devolvía `undefined` en ese caso y la UI ya lo pintaba como desconocido; aquí
 * se devuelve `null` y llama cada componente a `hasAnyMetric` para decidir.
 *
 * <p>El ranking del dashboard usa esta función para ordenar, así que solo se
 *llama cuando hay métricas: un `null` desordena el `sort`.
 */
export default function calculateEnvironmentScore(environment) {
  if (!hasAnyMetric(environment)) return null;

  let score = 100;

  if (environment.temp > 26 || environment.temp < 20) score -= 10;

  if (environment.humidity > 60 || environment.humidity < 40) score -= 10;

  if (environment.co2 > 800) score -= 20;

  if (environment.co2 > 1000) score -= 20;

  if (environment.noise > 55) score -= 15;

  if (environment.noise > 70) score -= 15;

  return Math.max(score, 0);
}
