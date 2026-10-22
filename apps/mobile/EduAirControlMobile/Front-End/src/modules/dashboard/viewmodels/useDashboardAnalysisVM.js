/**
 * ViewModel: useDashboardAnalysisVM
 * Lógica del dashboard (período, métrica, serie histórica, KPIs y salud de la
 * red) — consumiendo la API real de ms-environment-monitoring:
 *
 * - GET /api/v1/dashboard/summary  → averages, counts, lastUpdated
 * - GET /api/v1/dashboard/series   → buckets {bucket, value, samples}
 *
 * Los valores actuales por ambiente (comparación) salen del contexto de
 * ambientes, que ya mergea /api/v1/environments/current.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnvironments } from '../../../context/EnvironmentContext'
import apiClient from '../../../shared/services/apiClient'
import { METRICS, PERIOD_IDS, formatMetric, normalizeStatus } from '../utils/historicalSeries'

const METRIC_FIELD = {
  co2: 'co2',
  temperature: 'temp',
  humidity: 'humidity',
  noise: 'noise',
}

function formatBucketLabel(bucket, period, locale) {
  const date = new Date(bucket)
  if (Number.isNaN(date.getTime())) return ''
  if (period === 'day') {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  if (period === 'year') {
    return date.toLocaleDateString(locale, { month: 'short' })
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
}

function relativeLabel(iso, t) {
  if (!iso) return t('dashboardAnalysis.updatedAgo', 'sin datos')
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return t('dashboardAnalysis.updatedAgo', 'sin datos')
  const minutes = Math.max(0, Math.round(diffMs / 60000))
  if (minutes < 1) return t('dashboardAnalysis.updatedNow', 'actualizado ahora')
  if (minutes < 60) return t('dashboardAnalysis.updatedMinutes', { count: minutes, defaultValue: 'hace {{count}} min' })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('dashboardAnalysis.updatedHours', { count: hours, defaultValue: 'hace {{count}} h' })
  const days = Math.round(hours / 24)
  return t('dashboardAnalysis.updatedDays', { count: days, defaultValue: 'hace {{count}} d' })
}

export function useDashboardAnalysisVM() {
  const { t, i18n } = useTranslation()
  const { environments = [], refreshEnvironments } = useEnvironments()

  const [period, setPeriod] = useState('day')
  const [metric, setMetric] = useState('co2')
  const [environmentId, setEnvironmentId] = useState('all')
  const [summary, setSummary] = useState(null)
  const [buckets, setBuckets] = useState([])
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesError, setSeriesError] = useState(null)
  const [isFresh, setIsFresh] = useState(false)
  const requestId = useRef(0)

  const periods = useMemo(
    () =>
      PERIOD_IDS.map((id) => ({
        id,
        label: t(`dashboardAnalysis.periods.${id}`),
        context: t(`dashboardAnalysis.periods.${id}Context`),
      })),
    [t]
  )

  const metricLabels = useMemo(
    () => ({
      co2: 'CO₂',
      temperature: t('dashboardAnalysis.labels.temperature'),
      humidity: t('dashboardAnalysis.labels.humidity'),
      noise: t('dashboardAnalysis.labels.noise'),
    }),
    [t]
  )

  const statusLabels = useMemo(
    () => ({
      normal: t('dashboardAnalysis.labels.normal'),
      warning: t('dashboardAnalysis.labels.warning'),
      alert: t('dashboardAnalysis.labels.alert'),
    }),
    [t]
  )

  const selectedEnvironments = useMemo(() => {
    if (environmentId === 'all') return environments
    return environments.filter((env) => String(env.id) === String(environmentId))
  }, [environmentId, environments])

  const periodInfo = periods.find((item) => item.id === period) || periods[0]

  const selectedLabel =
    environmentId === 'all'
      ? t('dashboardAnalysis.context.allEnvironments')
      : selectedEnvironments[0]?.name || t('dashboardAnalysis.context.noEnvironment', 'Sin ambiente seleccionado')

  const metricInfo = METRICS[metric]

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/v1/dashboard/summary')
      setSummary(data)
    } catch {
      // el summary es best-effort: el gráfico y los contadores siguen siendo útiles
      setSummary(null)
    }
  }, [])

  const loadSeries = useCallback(async () => {
    const id = ++requestId.current
    setSeriesLoading(true)
    setSeriesError(null)
    try {
      const params = { period, variable: metric }
      if (environmentId !== 'all') params.environmentId = environmentId
      const rows = await apiClient.get('/api/v1/dashboard/series', { params })
      if (id !== requestId.current) return
      setBuckets(Array.isArray(rows) ? rows : [])
    } catch (e) {
      if (id !== requestId.current) return
      setBuckets([])
      setSeriesError(e.message || 'No fue posible cargar la serie')
    } finally {
      if (id === requestId.current) setSeriesLoading(false)
    }
  }, [period, metric, environmentId])

  useEffect(() => {
    loadSeries()
  }, [loadSeries])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const series = useMemo(() => {
    const points = buckets.map((row) => ({
      label: formatBucketLabel(row.bucket, period, i18n.language),
      value: Number(row.value),
    }))
    return [{ id: environmentId === 'all' ? 'network' : environmentId, name: selectedLabel, points }]
  }, [buckets, period, environmentId, selectedLabel, i18n.language])

  const pointCount = series[0]?.points.length || 0

  // Comparación por ambiente: último valor real de la métrica seleccionada.
  const comparisonData = useMemo(
    () =>
      selectedEnvironments
        .map((environment, index) => ({
          id: environment.id,
          name: environment.name,
          value: Number(environment[METRIC_FIELD[metric]]) || 0,
          color: index,
        }))
        .filter((item) => item.value > 0),
    [selectedEnvironments, metric]
  )

  const average = useMemo(() => {
    const fromSummary = summary?.averages?.[metric]
    if (fromSummary != null) return Number(fromSummary)
    if (!comparisonData.length) return 0
    return comparisonData.reduce((total, item) => total + item.value, 0) / comparisonData.length
  }, [summary, metric, comparisonData])

  const statusCounts = useMemo(
    () =>
      selectedEnvironments.reduce(
        (counts, environment) => {
          counts[normalizeStatus(environment.statusKey).key] += 1
          return counts
        },
        { normal: 0, warning: 0, alert: 0 }
      ),
    [selectedEnvironments]
  )

  const chartRange = useMemo(() => {
    const values = series.flatMap((item) => item.points.map((point) => point.value))
    const min = Math.min(metricInfo.domain[0], metricInfo.comfort, ...(values.length ? values : [0]))
    const max = Math.max(metricInfo.domain[1], metricInfo.comfort, ...(values.length ? values : [1]))
    return { min, max, comfort: metricInfo.comfort }
  }, [series, metricInfo])

  const refresh = useCallback(() => {
    setIsFresh(true)
    loadSummary()
    loadSeries()
    if (refreshEnvironments) refreshEnvironments()
    setTimeout(() => setIsFresh(false), 2600)
  }, [loadSummary, loadSeries, refreshEnvironments])

  const healthPercent = selectedEnvironments.length
    ? Math.round((statusCounts.normal / selectedEnvironments.length) * 100)
    : 0

  const lastUpdatedLabel = isFresh
    ? t('dashboardAnalysis.updatedNow', 'actualizado ahora')
    : relativeLabel(summary?.lastUpdated, t)

  return {
    environments,
    period,
    setPeriod,
    metric,
    setMetric,
    environmentId,
    setEnvironmentId,
    periods,
    periodInfo,
    metricLabels,
    statusLabels,
    metricInfo,
    metricLabel: metricLabels[metric],
    selectedLabel,
    selectedEnvironments,
    series,
    pointCount,
    comparisonData,
    average,
    summaryCounts: summary?.counts || null,
    statusCounts,
    chartRange,
    healthPercent,
    lastUpdatedLabel,
    seriesLoading,
    seriesError,
    formatMetric: (value) => formatMetric(value, metric),
    refresh,
  }
}

export default useDashboardAnalysisVM
