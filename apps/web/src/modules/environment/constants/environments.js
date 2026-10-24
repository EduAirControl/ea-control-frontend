// Constantes para status de ambientes
export const STATUS = {
  NORMAL: 'dashboard.statusNormal',
  WARNING: 'dashboard.statusWarning',
  ALERT: 'dashboard.statusAlert',
}

// Constantes para calidad del aire
export const QUALITY = {
  GOOD: 'dashboard.qualityGood',
  REGULAR: 'dashboard.qualityRegular',
  BAD: 'dashboard.qualityBad',
}

// Colores por status
export const STATUS_COLORS = {
  [STATUS.NORMAL]: '#4CAF50',
  [STATUS.WARNING]: '#FFC107',
  [STATUS.ALERT]: '#F44336',
}

// Colores por calidad
export const QUALITY_COLORS = {
  [QUALITY.GOOD]: '#4CAF50',
  [QUALITY.REGULAR]: '#FFC107',
  [QUALITY.BAD]: '#F44336',
}
