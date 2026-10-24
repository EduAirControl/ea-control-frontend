/**
 * Métricas ambientales: mapeo del contrato del backend y derivación del estado.
 *
 * <p>Lógica pura — sin hooks, sin estado React.
 *
 * <p>El backend ({@code ms-environment-monitoring}) devuelve la última medición por
 * (ambiente, variable) con {@code variableCode} ({@code temperature}, {@code humidity},
 * {@code co2}, {@code noise}). La UI usa cortos ({@code temp}, {@code co2}, …) y un
 * {@code statusKey} que alimenta el ranking, los filtros y los contadores.
 */

import { STATUS } from '../constants/environments';

/** Códigos del catálogo del backend → campos que consume la UI. */
const CODE_TO_FIELD = {
  temperature: 'temp',
  humidity: 'humidity',
  co2: 'co2',
  noise: 'noise',
};

/**
 * Agrupa las mediciones por ambiente.
 *
 * @param {Array<{environmentId:string, variableCode:string, value:number}>} rows
 * @returns {Record<string, {temp?:number, humidity?:number, co2?:number, noise?:number}>}
 */
export function mapMetricsByEnvironment(rows) {
  const byEnvironment = {};
  for (const row of rows || []) {
    const field = CODE_TO_FIELD[row.variableCode];
    if (!field || row.environmentId == null) continue;
    const entry = byEnvironment[row.environmentId] || (byEnvironment[row.environmentId] = {});
    entry[field] = Number(row.value);
    // El backend evalúa la lectura contra los umbrales vigentes del ambiente.
    // Se guarda por variable para que cada tarjeta pinte su propio estado.
    entry.severity = entry.severity || {};
    entry.severity[field] = row.severityCode || null;
    if (!entry.measuredAt || row.measuredAt > entry.measuredAt) entry.measuredAt = row.measuredAt;
  }
  return byEnvironment;
}

const SEVERITY = { OK: 0, WARNING: 1, ALERT: 2 };

/**
 * Severidad del backend ('OK' | 'WARNING' | 'CRITICAL') → nivel.
 *
 * <p>Los umbrales NO viven aquí: los calcula ms-environment-monitoring con la
 * configuración (override por ambiente) que edita el admin en la gestión. El front
 * solo pinta lo que el backend decide — una sola fuente de verdad.
 */
function levelOfSeverity(severityCode) {
  if (severityCode === 'CRITICAL') return SEVERITY.ALERT;
  if (severityCode === 'WARNING') return SEVERITY.WARNING;
  if (severityCode === 'OK') return SEVERITY.OK;
  return null;
}

/**
 * ¿El ambiente tiene alguna medición?
 *
 * <p>Un ambiente recién creado (o cuyo sensor nunca ha reportado) llega con las
 * cuatro métricas en `undefined`. Distinguir ese caso del "todo en 0" importa:
 * sin datos no se debe pintar un estado normal ni un score perfecto.
 */
export function hasAnyMetric(environment) {
  if (!environment) return false;
  return Object.values(CODE_TO_FIELD).some((field) => {
    const value = environment[field];
    return value !== undefined && value !== null && !Number.isNaN(value);
  });
}

/**
 * Estado global de un ambiente.
 *
 * <p>Se toma la peor severidad de las lecturas actuales evaluadas por el backend
 * contra los umbrales del ambiente. Reconocer una alerta no cambia el estado: una
 * lectura sigue fuera de rango hasta que el sensor reporte un valor normal o el
 * admin ajuste el umbral. Si el backend todavía no envía `severityCode` se usa la
 * peor alerta activa como respaldo.
 *
 * <ul>
 *   <li>CRITICAL → alerta; WARNING → advertencia;</li>
 *   <li>solo OK y con mediciones → normal;</li>
 *   <li>sin datos evaluables → «desconocido» (no pintar verde inventado).</li>
 * </ul>
 */
export function deriveStatusKey(metrics, alertSeverity) {
  const severities = Object.values(metrics?.severity || {});
  const levels = severities.map(levelOfSeverity).filter((level) => level !== null);

  if (levels.length > 0) {
    const worst = Math.max(...levels);
    if (worst >= SEVERITY.ALERT) return STATUS.ALERT;
    if (worst >= SEVERITY.WARNING) return STATUS.WARNING;
    return STATUS.NORMAL;
  }

  const fallback = levelOfSeverity(alertSeverity);
  if (fallback !== null) {
    if (fallback >= SEVERITY.ALERT) return STATUS.ALERT;
    if (fallback >= SEVERITY.WARNING) return STATUS.WARNING;
    return STATUS.NORMAL;
  }

  return hasAnyMetric(metrics) ? STATUS.NORMAL : undefined;
}
