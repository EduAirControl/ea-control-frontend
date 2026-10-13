export const METRICS = {
  co2: {
    label: 'CO₂',
    unit: 'ppm',
    color: '#01805b',
    comfort: 800,
    domain: [350, 1300],
    icon: 'cloud-outline',
  },
  temperature: {
    label: 'temperature',
    unit: '°C',
    color: '#FF6873',
    comfort: 22,
    domain: [18, 34],
    icon: 'thermometer-outline',
  },
  humidity: {
    label: 'humidity',
    unit: '%',
    color: '#58AFFF',
    comfort: 50,
    domain: [25, 80],
    icon: 'water-outline',
  },
  noise: {
    label: 'noise',
    unit: 'dB',
    color: '#D98AFF',
    comfort: 45,
    domain: [20, 85],
    icon: 'volume-high-outline',
  },
}

export const STATUS_KEYS = {
  normal: { key: 'normal', color: '#25E77C' },
  warning: { key: 'warning', color: '#FFB11A' },
  alert: { key: 'alert', color: '#FF4D5B' },
}

export const ENVIRONMENT_COLORS = ['#01805b', '#FFB11A', '#FF4D5B', '#9D73FF', '#49D17D', '#58AFFF']

// gifted-charts admite máximo 5 series por gráfica (data..data5)
export const MAX_SERIES = 5

export const PERIOD_IDS = ['day', 'week', 'month', 'year']

export function normalizeStatus(statusKey) {
  const value = String(statusKey || '').toLowerCase()
  if (value.includes('alert')) return STATUS_KEYS.alert
  if (value.includes('warning')) return STATUS_KEYS.warning
  return STATUS_KEYS.normal
}

export function formatMetric(value, metric) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  if (metric === 'temperature') return `${Number(value).toFixed(1)}°C`
  return `${Math.round(Number(value))} ${METRICS[metric].unit}`
}

export function getSeriesColors(count) {
  return Array.from({ length: count }, (_, index) => ENVIRONMENT_COLORS[index % ENVIRONMENT_COLORS.length])
}
