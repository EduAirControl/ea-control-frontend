/**
 * ViewModel: useSensorPanelVM
 * Pestaña "Sensores" del panel admin: inventario de dispositivos IoT
 * (ms-sensor-management) con su instalación activa en cada ambiente.
 *
 * Un sensor es un dispositivo ({serialNumber, sensorModelId, sensorStatusId});
 * el vínculo con el ambiente vive en /sensor-installations. Los umbrales
 * min/max no existen en el backend (ADR-014) y no se muestran como editables.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnvironments } from '../../../context/EnvironmentContext'
import sensorService from '../services/sensorService'

const EMPTY_FORM = {
  serial: '',
  modelId: '',
  statusId: '',
  environmentId: '',
}

const EMPTY_EDIT = {
  id: '',
  serialNumber: '',
  modelId: '',
  statusId: '',
  environmentId: '',
}

export function useSensorPanelVM() {
  const { t } = useTranslation()
  const { environments } = useEnvironments()

  const [sensors, setSensors] = useState([])
  const [models, setModels] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sensorRows, installations, modelRows, statusRows] = await Promise.all([
        sensorService.getAll(),
        sensorService.listInstallations(undefined, { active: true }).catch(() => []),
        sensorService.listModels().catch(() => []),
        sensorService.listStatuses().catch(() => []),
      ])
      const installBySensor = {}
      installations.forEach((row) => {
        if (!row.removedAt) installBySensor[row.sensorId] = row
      })
      const statusById = {}
      statusRows.forEach((row) => {
        statusById[row.sensorStatusId ?? row.id] = row
      })
      const modelById = {}
      modelRows.forEach((row) => {
        modelById[row.sensorModelId ?? row.id] = row
      })

      setModels(modelRows)
      setStatuses(statusRows)
      setSensors(
        sensorRows.map((sensor) => {
          const installation = installBySensor[sensor.sensorId]
          const status = statusById[sensor.sensorStatusId]
          const model = modelById[sensor.sensorModelId]
          const installed = Boolean(installation)
          const statusCode = status?.code || 'ACTIVE'
          const uiStatus = !installed ? 'uninstalled' : statusCode === 'ACTIVE' ? 'active' : 'offline'
          return {
            id: sensor.sensorId,
            sensorId: sensor.sensorId,
            serialNumber: sensor.serialNumber,
            modelId: sensor.sensorModelId,
            modelName: model?.name || model?.code || '—',
            statusId: sensor.sensorStatusId,
            statusCode,
            environmentId: installation?.educationalEnvironmentId || null,
            installationId: installation?.sensorInstallationId || null,
            installedAt: installation?.installedAt || null,
            lastSeenAt: sensor.lastSeenAt,
            installed,
            uiStatus,
          }
        })
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const getEnvironmentName = useCallback(
    (id) => {
      const env = environments.find((item) => String(item.id) === String(id))
      if (!env) return t('sensors.noEnvironment')
      return env.nameKey ? t(env.nameKey) : env.name || t('sensors.noEnvironment')
    },
    [environments, t]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sensors.filter((sensor) => {
      const haystack = `${sensor.serialNumber} ${sensor.modelName} ${getEnvironmentName(sensor.environmentId)}`.toLowerCase()
      const matchesSearch = !q || haystack.includes(q)
      return matchesSearch && (statusFilter === 'all' || sensor.uiStatus === statusFilter)
    })
  }, [sensors, search, statusFilter, getEnvironmentName])

  const summary = useMemo(
    () => ({
      total: sensors.length,
      active: sensors.filter((s) => s.uiStatus === 'active').length,
      offline: sensors.filter((s) => s.uiStatus === 'offline').length,
      uninstalled: sensors.filter((s) => s.uiStatus === 'uninstalled').length,
    }),
    [sensors]
  )

  const codeId = (row) => row?.sensorStatusId ?? row?.id

  /** Alta de dispositivo + instalación opcional en un ambiente. */
  const addSensor = async (payload) => {
    const serial = String(payload.serial || '').trim().toUpperCase()
    let sensor
    try {
      sensor = await sensorService.create({
        sensorId: serial,
        sensorModelId: payload.modelId,
        sensorStatusId: payload.statusId,
      })
    } catch (e) {
      // Serial duplicado: se recupera el sensor existente y se sigue (reintento).
      if (e.status !== 409) throw e
      sensor = await sensorService.findBySerial(serial)
      if (!sensor) throw e
    }
    if (payload.environmentId) {
      const open = await sensorService.listInstallations(sensor.sensorId, { active: true })
      const current = open.find((row) => !row.removedAt)
      if (current) {
        if (String(current.educationalEnvironmentId) !== String(payload.environmentId)) {
          await sensorService.removeInstallation(current.sensorInstallationId ?? current.id)
          await sensorService.install(sensor.sensorId, payload.environmentId)
        }
      } else {
        await sensorService.install(sensor.sensorId, payload.environmentId)
      }
    }
    setShowAdd(false)
    setForm(EMPTY_FORM)
    await load()
  }

  /** Edición de modelo/estado y, si cambia, reubicación del dispositivo. */
  const saveSensor = async (payload) => {
    await sensorService.update(payload.id, {
      sensorModelId: payload.modelId,
      sensorStatusId: payload.statusId,
    })
    const sensor = sensors.find((s) => String(s.id) === String(payload.id))
    const nextEnv = payload.environmentId || ''
    const currentEnv = sensor?.environmentId ? String(sensor.environmentId) : ''
    if (nextEnv !== currentEnv) {
      if (sensor?.installationId) {
        await sensorService.removeInstallation(sensor.installationId)
      }
      if (nextEnv) {
        await sensorService.install(payload.id, nextEnv)
      }
    }
    setEditing(null)
    await load()
  }

  /** Activa/desactiva el dispositivo (ACTIVE ⇄ INACTIVE del catálogo). */
  const toggleSensor = async (sensor) => {
    const active = statuses.find((s) => s.code === 'ACTIVE')
    const inactive = statuses.find((s) => s.code === 'INACTIVE')
    if (!active || !inactive) {
      throw new Error(t('sensors.statusCatalogError', 'No hay catálogo de estados disponible'))
    }
    const nextId = sensor.statusCode === 'ACTIVE' ? codeId(inactive) : codeId(active)
    await sensorService.update(sensor.id, { sensorStatusId: nextId })
    await load()
  }

  /** Desvincula el dispositivo del ambiente (cierra la instalación). */
  const uninstallSensor = async (sensor) => {
    if (!sensor.installationId) return
    await sensorService.removeInstallation(sensor.installationId)
    await load()
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  return {
    // data
    sensors,
    filtered,
    summary,
    environments,
    models,
    statuses,
    loading,
    error,
    // filters
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    resetFilters,
    // modals
    showAdd,
    setShowAdd,
    editing,
    setEditing,
    form,
    setForm,
    // actions
    addSensor,
    saveSensor,
    toggleSensor,
    uninstallSensor,
    reload: load,
    getEnvironmentName,
    defaultModelId: () => models.find((m) => m.code === 'ESP32_FULL')?.sensorModelId || models[0]?.sensorModelId || '',
    defaultStatusId: () => statuses.find((s) => s.code === 'ACTIVE')?.sensorStatusId || statuses[0]?.sensorStatusId || '',
  }
}

export default useSensorPanelVM
