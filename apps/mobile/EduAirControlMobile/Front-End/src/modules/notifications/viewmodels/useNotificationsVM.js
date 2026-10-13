import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnvironments } from '../../../context/EnvironmentContext'
import alertService from '../services/alertService'

const SEVERITY_TYPE = {
  CRITICAL: 'danger',
  WARNING: 'warning',
  INFO: 'info',
}

export function useNotificationsVM() {
  const { environments } = useEnvironments()
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAlerts(await alertService.listActive(50))
      setError(null)
    } catch (e) {
      setAlerts([])
      setError(e.message || 'No fue posible cargar las alertas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const envName = useCallback(
    (id) => environments.find((env) => String(env.id) === String(id))?.name || '',
    [environments]
  )

  const allNotifications = useMemo(() => {
    const variableLabels = {
      co2: 'CO₂',
      temperature: t('dashboardAnalysis.labels.temperature'),
      humidity: t('dashboardAnalysis.labels.humidity'),
      noise: t('dashboardAnalysis.labels.noise'),
    }
    const list = alerts.map((alert) => {
      const type = SEVERITY_TYPE[alert.severityCode] || 'info'
      const variableLabel = variableLabels[alert.variableCode] || alert.variableCode
      const name = envName(alert.environmentId)
      const value = alert.triggeringValue != null ? Number(alert.triggeringValue) : null
      return {
        id: alert.id,
        type,
        title: t(`notifications.severity.${alert.severityCode}`, alert.severityCode),
        message: t('notifications.alertMessage', {
          defaultValue: '{{variable}} fuera de rango en {{environment}}{{value}}',
          variable: variableLabel,
          environment: name || t('notifications.unknownEnvironment', 'ambiente desconocido'),
          value: value != null ? ` (${value})` : '',
        }),
        envId: alert.environmentId,
        time: alert.raisedAt ? new Date(alert.raisedAt) : new Date(),
      }
    })

    const critical = list.filter((n) => n.type === 'danger').length
    const warning = list.filter((n) => n.type === 'warning').length
    list.push({
      id: 'summary',
      type: 'info',
      title: t('notifications.dailySummary'),
      message: t('notifications.summaryMessage', {
        alerts: critical,
        warnings: warning,
        count: environments.length,
      }),
      envId: null,
      time: new Date(),
    })

    return list
  }, [alerts, environments, envName, t])

  const filtered = useMemo(() => {
    if (filter === 'all') return allNotifications
    return allNotifications.filter((n) => n.type === filter)
  }, [filter, allNotifications])

  // Todas las alertas cargadas están activas (sin reconocer).
  const unreadCount = alerts.length

  const acknowledge = useCallback(async (id) => {
    try {
      await alertService.acknowledge(id)
      setAlerts((prev) => prev.filter((alert) => alert.id !== id))
      return true
    } catch {
      return false
    }
  }, [])

  const markAllRead = useCallback(async () => {
    await Promise.all(alerts.map((alert) => alertService.acknowledge(alert.id).catch(() => {})))
    setAlerts([])
  }, [alerts])

  return {
    all: allNotifications,
    notifications: filtered,
    unreadCount,
    filter,
    setFilter,
    loading,
    error,
    reload: load,
    acknowledge,
    markAllRead,
  }
}

export default useNotificationsVM
