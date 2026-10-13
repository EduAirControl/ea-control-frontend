/**
 * Métricas ambientales: mapeo del contrato de ms-environment-monitoring y
 * derivación del estado del ambiente.
 *
 * Lógica pura — sin hooks, sin estado React. Port del equivalente web
 * (apps/web/.../utils/environmentMetrics.js).
 *
 * El backend devuelve la última medición por (ambiente, variable) con
 * `variableCode` (temperature, humidity, co2, noise). La UI usa campos cortos
 * (temp, humidity, co2, noise) y un `statusKey` (clave i18n) que alimenta
 * badges, filtros, contadores y score.
 */

/** Claves i18n de estado compartidas con getEnvironmentStatus. */
export const STATUS = {
  NORMAL: 'dashboard.statusNormal',
  WARNING: 'dashboard.statusWarning',
  ALERT: 'dashboard.statusAlert',
}

/** Códigos del catálogo del backend → campos que consume la UI. */
const CODE_TO_FIELD = {
  temperature: 'temp',
  humidity: 'humidity',
  co2: 'co2',
  noise: 'noise',
}

/**
 * Agrupa las últimas mediciones por ambiente.
 *
 * @param {Array<{environmentId:string, variableCode:string, value:number, measuredAt:string}>} rows
 * @returns {Record<string, {temp?:number, humidity?:number, co2?:number, noise?:number, measuredAt?:string}>}
 */
export function mapMetricsByEnvironment(rows) {
  const byEnvironment = {}
  for (const row of rows || []) {
    const field = CODE_TO_FIELD[row.variableCode]
    if (!field || row.environmentId == null) continue
    const entry = byEnvironment[row.environmentId] || (byEnvironment[row.environmentId] = {})
    entry[field] = Number(row.value)
    if (!entry.measuredAt || row.measuredAt > entry.measuredAt) entry.measuredAt = row.measuredAt
  }
  return byEnvironment
}

const SEVERITY = { OK: 0, WARNING: 1, ALERT: 2 }

/** Severidad de una métrica concreta; mismos umbrales que getMetricStatus. */
function severityOf(field, value) {
  if (value === undefined || value === null || Number.isNaN(value)) return SEVERITY.OK
  switch (field) {
    case 'temp':
      return value >= 20 && value <= 26 ? SEVERITY.OK : SEVERITY.WARNING
    case 'humidity':
      return value >= 40 && value <= 60 ? SEVERITY.OK : SEVERITY.WARNING
    case 'co2':
      if (value <= 800) return SEVERITY.OK
      return value <= 1000 ? SEVERITY.WARNING : SEVERITY.ALERT
    case 'noise':
      if (value <= 50) return SEVERITY.OK
      return value <= 65 ? SEVERITY.WARNING : SEVERITY.ALERT
    default:
      return SEVERITY.OK
  }
}

/**
 * Estado global de un ambiente: la peor severidad entre sus métricas.
 * Sin métricas devuelve undefined y la UI muestra «desconocido».
 */
export function deriveStatusKey(metrics) {
  if (!metrics) return undefined
  const worst = Object.values(CODE_TO_FIELD).reduce((acc, field) => {
    const severity = severityOf(field, metrics[field])
    return severity > acc ? severity : acc
  }, SEVERITY.OK)

  if (worst >= SEVERITY.ALERT) return STATUS.ALERT
  if (worst >= SEVERITY.WARNING) return STATUS.WARNING

  const hasAnyMetric = Object.values(CODE_TO_FIELD).some((f) => metrics[f] !== undefined)
  return hasAnyMetric ? STATUS.NORMAL : undefined
}
