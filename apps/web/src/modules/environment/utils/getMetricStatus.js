const COLORS = {
  ok: '#2ecc71',
  warning: '#f39c12',
  critical: '#e74c3c',
  muted: '#999',
};

function colorOf(severity) {
  if (severity === 'CRITICAL') return COLORS.critical;
  if (severity === 'WARNING') return COLORS.warning;
  return COLORS.ok;
}

/**
 * Estado cualitativo de una métrica según la severidad que calculó el backend
 * con los umbrales configurados para ese ambiente. El front no compara valores
 * contra rangos fijos: si no hay severidad, no inventa un estado.
 */
export default function getMetricStatus(type, value, t, severityCode) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return {
      text: t('common.noData'),
      color: COLORS.muted,
      severity: null,
    };
  }

  if (severityCode !== 'OK' && severityCode !== 'WARNING' && severityCode !== 'CRITICAL') {
    return {
      text: '',
      color: COLORS.muted,
      severity: null,
    };
  }

  const severity = severityCode;
  const color = colorOf(severity);
  const isOk = severity === 'OK';
  const isCritical = severity === 'CRITICAL';

  switch (type) {
    case 'temp':
      return {
        text: isOk
          ? t('allEnvironments.statusIdeal')
          : t('allEnvironments.statusOutOfRange'),
        color,
        severity,
      };

    case 'humidity':
      return {
        text: isOk ? t('allEnvironments.statusIdeal') : t('allEnvironments.statusOutOfRange'),
        color,
        severity,
      };

    case 'co2':
      return {
        text: isOk
          ? t('allEnvironments.co2Good')
          : isCritical
            ? t('allEnvironments.co2Bad')
            : t('allEnvironments.co2Regular'),
        color,
        severity,
      };

    case 'noise':
      return {
        text: isOk
          ? t('allEnvironments.noiseLow')
          : isCritical
            ? t('allEnvironments.noiseHigh')
            : t('allEnvironments.noiseModerate'),
        color,
        severity,
      };

    default:
      return {
        text: '',
        color: COLORS.muted,
        severity: null,
      };
  }
}
