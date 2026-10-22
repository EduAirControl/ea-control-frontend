export function getEnvironmentStatus(statusKey, t, colors) {
  switch (statusKey) {
    case 'dashboard.statusNormal':
      return {
        color: colors?.success || '#22c55e',
        icon: 'checkmark-circle',
        text: t('dashboard.statusNormal'),
        bg: colors?.successDim || '#22c55e20',
      }

    case 'dashboard.statusWarning':
      return {
        color: colors?.warning || '#f59e0b',
        icon: 'warning',
        text: t('dashboard.statusWarning'),
        bg: colors?.warningDim || '#f59e0b20',
      }

    case 'dashboard.statusAlert':
      return {
        color: colors?.error || '#ef4444',
        icon: 'alert-circle',
        text: t('dashboard.statusAlert'),
        bg: colors?.errorDim || '#ef444420',
      }

    default:
      return {
        color: colors?.textMuted || '#64748b',
        icon: 'help-circle',
        text: t('common.unknown'),
        bg: colors?.bgSubtle || '#94a3b820',
      }
  }
}
