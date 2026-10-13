// Tokens de tema 1:1 con index.css y design-system.css del web.
// Unión de la paleta legacy del móvil (darkColors/lightColors) con los
// tokens CSS del web (--accent, --lb-glass-*, --radius-*, --space-*, --shadow-*).

export function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Radios de borde ──
export const RADII = { sm: 10, md: 16, lg: 20, xl: 28, full: 999 }

// ── Espaciado ──
export const SPACE = { xs: 6, sm: 12, md: 20, lg: 32, xl: 48 }

// ── Sombras ──
export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  lg: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 40, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  xl: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 60, shadowOffset: { width: 0, height: 20 }, elevation: 12 },
  glass: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 32, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
}

function baseTokens({ dark }) {
  const accent = dark ? '#3cc99a' : '#01805b'
  const accentButton = dark ? '#016c4d' : '#01805b'
  return {
    dark,
    // legacy móvil
    accent,
    accentHover: dark ? '#60dbaf' : '#016d4d',
    accentButton,
    textOnAccent: '#ffffff',
    accentDim: dark ? 'rgba(60,201,154,0.17)' : 'rgba(1,128,91,0.15)',
    bgBody: dark ? '#0a0f1e' : '#f0fafa',
    bgCard: dark ? '#111827' : '#ffffff',
    bgCardAlt: dark ? '#162035' : '#f8fafc',
    bgInput: dark ? '#1a2540' : '#ffffff',
    textPrimary: dark ? '#f1f5f9' : '#111827',
    textSecondary: dark ? '#cbd5e1' : '#374151',
    textMuted: dark ? '#94a3b8' : '#4b5563',
    borderColor: dark ? '#2d3f5c' : '#d1d5db',
    borderColorLight: dark ? '#1e2d45' : '#e5e7eb',
    error: dark ? '#f23838' : '#d63030',
    errorButton: '#b42318',
    errorDim: dark ? 'rgba(242,56,56,0.15)' : 'rgba(214,48,48,0.15)',
    warning: dark ? '#ffc107' : '#9d6602',
    warningDim: dark ? 'rgba(255,193,7,0.15)' : 'rgba(157,102,2,0.15)',
    success: dark ? '#4ca649' : '#368139',
    successDim: dark ? 'rgba(76,166,73,0.15)' : 'rgba(54,129,57,0.15)',
    facebook: '#1877F2',
    // nuevos (web)
    accentLight: '#e8faf5',
    accentDark: '#00513d',
    bgNav: dark ? '#060c1a' : '#ffffff',
    bgSubtle: dark ? '#162035' : '#f3f6f6',
    info: dark ? '#73c8ff' : '#005a9c',
    infoDim: dark ? 'rgba(115,200,255,0.16)' : 'rgba(0,90,156,0.12)',
    chartPalette: dark
      ? ['#56b4e9', '#f0c35a', '#42d6a4', '#d995ce', '#ff8a65', '#a8c8ff']
      : ['#0072b2', '#a65e00', '#007a5e', '#9b4f96', '#c44536', '#4263a5'],
    borderCard: dark ? '#1e2d45' : '#e5e7eb',
    // glass
    glassBg: dark ? 'rgba(8,16,38,0.82)' : 'rgba(255,255,255,0.78)',
    glassBgHover: dark ? 'rgba(8,16,38,0.96)' : 'rgba(255,255,255,0.94)',
    glassBorder: dark ? 'rgba(60,201,154,0.26)' : 'rgba(1,128,91,0.22)',
    glassBorderHover: dark ? 'rgba(60,201,154,0.5)' : 'rgba(1,128,91,0.52)',
    glassBlur: dark ? 18 : 16,
    glassTextPrimary: dark ? '#e2e8f0' : '#0f172a',
    glassTextMuted: dark ? '#94a3b8' : '#64748b',
    glassTextPill: dark ? '#cbd5e1' : '#334155',
    glassSurface: dark ? 'rgba(60,201,154,0.12)' : 'rgba(1,128,91,0.08)',
    glassTrack: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    // escala
    radius: RADII,
    space: SPACE,
    shadows: SHADOWS,
  }
}

export const darkTokens = baseTokens({ dark: true })
export const lightTokens = baseTokens({ dark: false })

// ── Temas daltonismo (accent + superficies) ──
const COLOR_BLIND_THEMES = {
  'theme-protanopia': {
    accent: ['#005a9c', '#73c8ff'], accentButton: '#005a9c', accentHover: ['#004477', '#9bd8ff'],
    accentLight: ['#e6f5fb', '#102b3d'], accentDark: ['#004477', '#bce7ff'],
  },
  'theme-deuteranopia': {
    accent: ['#006b70', '#63d5cf'], accentButton: '#006b70', accentHover: ['#005357', '#8ce5df'],
    accentLight: ['#e5f7f5', '#102d2e'], accentDark: ['#00494d', '#a9f0e8'],
  },
  'theme-tritanopia': {
    accent: ['#6841a5', '#b39aff'], accentButton: '#6841a5', accentHover: ['#50327f', '#c8b8ff'],
    accentLight: ['#f0ebff', '#251d3a'], accentDark: ['#413460', '#d6cbff'],
  },
}

// Status colors are chosen from a color-vision-safe palette. Each status is
// also shown with its text label and icon, so meaning never depends on hue alone.
const ACCESSIBLE_STATUS_COLORS = {
  light: { success: '#007a5e', warning: '#8a4b00', error: '#a83232', info: '#005a9c' },
  dark: { success: '#42d6a4', warning: '#ffd166', error: '#ff8585', info: '#73c8ff' },
}

export function applyColorTheme(tokens, colorTheme) {
  const override = COLOR_BLIND_THEMES[colorTheme]
  if (!override) return tokens
  const mode = tokens.dark ? 'dark' : 'light'
  const next = {
    ...tokens,
    accent: override.accent[tokens.dark ? 1 : 0],
    accentButton: override.accentButton,
    accentHover: override.accentHover[tokens.dark ? 1 : 0],
    accentLight: override.accentLight[tokens.dark ? 1 : 0],
    accentDark: override.accentDark[tokens.dark ? 1 : 0],
    ...ACCESSIBLE_STATUS_COLORS[mode],
    errorButton: '#b42318',
    textMuted: tokens.dark ? '#b5c2d4' : '#475569',
    borderColor: tokens.dark ? '#91a4bd' : '#64748b',
    borderColorLight: tokens.dark ? '#53647a' : '#94a3b8',
    borderCard: tokens.dark ? '#53647a' : '#94a3b8',
  }
  next.accentDim = hexToRgba(next.accent, 0.16)
  next.successDim = hexToRgba(next.success, 0.16)
  next.warningDim = hexToRgba(next.warning, 0.16)
  next.errorDim = hexToRgba(next.error, 0.16)
  next.infoDim = hexToRgba(next.info, 0.16)
  next.glassBorder = hexToRgba(next.accent, tokens.dark ? 0.3 : 0.25)
  next.glassBorderHover = hexToRgba(next.accent, tokens.dark ? 0.55 : 0.5)
  next.glassSurface = hexToRgba(next.accent, tokens.dark ? 0.12 : 0.1)
  next.chartPalette = tokens.dark
    ? ['#56b4e9', '#f0c35a', '#42d6a4', '#d995ce', '#ff8a65', '#a8c8ff']
    : ['#0072b2', '#a65e00', '#007a5e', '#9b4f96', '#c44536', '#4263a5']
  return next
}
