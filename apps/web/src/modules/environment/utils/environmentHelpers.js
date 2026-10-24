/**
 * Helpers compartidos de ambiente.
 * Lógica pura — sin hooks, sin estado React.
 */

import { STATUS, QUALITY } from '../constants/environments';
import calculateEnvironmentScore from './calculateEnvironmentScore';

export const calcScore = calculateEnvironmentScore;

export function getStatusColor(statusKey) {
  switch (statusKey) {
    case STATUS.NORMAL:
      return '#3fb950';
    case STATUS.WARNING:
      return '#d29922';
    case STATUS.ALERT:
      return '#f85149';
    default:
      return '#8b949e';
  }
}

export function getQualityColor(qualityKey) {
  switch (qualityKey) {
    case QUALITY.GOOD:
      return '#3fb950';
    case QUALITY.REGULAR:
      return '#d29922';
    case QUALITY.BAD:
      return '#f85149';
    default:
      return '#8b949e';
  }
}

export function getBadgeClass(statusKey, qualityKey) {
  const key = qualityKey || statusKey;
  if (key === 'dashboard.qualityGood' || key === STATUS.NORMAL) return 'mgmt-card__badge--good';
  if (key === 'dashboard.qualityBad' || key === STATUS.ALERT) return 'mgmt-card__badge--alert';
  if (key === 'dashboard.qualityRegular' || key === STATUS.WARNING)
    return 'mgmt-card__badge--regular';
  return 'mgmt-card__badge--normal';
}

export function getMetricColor(_key, _value, severityCode) {
  // El color sale exclusivamente de la severidad calculada por el backend con
  // los umbrales del ambiente. Sin severidad no hay color "inventado".
  if (severityCode === 'CRITICAL') return '#f85149';
  if (severityCode === 'WARNING') return '#d29922';
  if (severityCode === 'OK') return '#3fb950';
  return '#8b949e';
}

export function getDisplayName(env, t) {
  return env.nameKey ? t(env.nameKey) : env.name || '';
}

export function getDisplayLocation(env, t) {
  return env.locationKey ? t(env.locationKey) : env.location || '';
}
