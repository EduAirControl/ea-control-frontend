/**
 * Helpers compartidos de ambiente.
 * Lógica pura — sin hooks, sin estado React.
 */

import calculateEnvironmentScore from './calculateEnvironmentScore'

export const calcScore = calculateEnvironmentScore

export function getMetricColor(key, value, colors) {
  const success = colors?.success || '#3fb950'
  const warning = colors?.warning || '#d29922'
  const error = colors?.error || '#f85149'
  if (!Number.isFinite(Number(value))) return colors?.textMuted || '#94a3b8'
  if (key === 'temp') return value > 25 ? error : value > 23 ? warning : success
  if (key === 'humidity') return value > 65 ? error : value < 35 ? warning : success
  if (key === 'co2') return value > 1200 ? error : value > 1000 ? warning : success
  if (key === 'noise') return value > 60 ? warning : success
  return success
}

export function getDisplayName(env, t) {
  return env.nameKey ? t(env.nameKey) : env.name || ''
}
