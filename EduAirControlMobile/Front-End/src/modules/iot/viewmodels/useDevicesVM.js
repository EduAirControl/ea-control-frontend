/**
 * ViewModel: useDevicesVM
 * Lista y CRUD de dispositivos IoT contra /api/devices (backend real).
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import deviceService from '../services/deviceService'

const EMPTY_FORM = { macAddress: '', nombre: '', tipo: 'esp32', idAula: '' }

export function useDevicesVM() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await deviceService.getAll()
      setDevices(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter((device) => {
      const haystack = `${device.macAddress} ${device.nombre || ''} ${device.ssid || ''}`.toLowerCase()
      const matchesSearch = !q || haystack.includes(q)
      const matchesStatus = statusFilter === 'all' || device.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [devices, search, statusFilter])

  const stats = useMemo(
    () => ({
      total: devices.length,
      connected: devices.filter((d) => d.estado === 'conectado').length,
      pending: devices.filter((d) => d.estado === 'pendiente').length,
      offline: devices.filter((d) => d.estado === 'offline' || d.estado === 'error').length,
    }),
    [devices]
  )

  const addDevice = async (payload) => {
    const created = await deviceService.create(payload)
    setShowAdd(false)
    setForm(EMPTY_FORM)
    await load()
    return created
  }

  const removeDevice = async (device) => {
    await deviceService.remove(device.id)
    setDeleteTarget(null)
    await load()
  }

  const setDeviceState = async (device, estado) => {
    await deviceService.update(device.id, {
      macAddress: device.macAddress,
      nombre: device.nombre,
      tipo: device.tipo,
      idAula: device.idAula,
      ssid: device.ssid,
      estado,
      firmwareVersion: device.firmwareVersion,
    })
    await load()
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  return {
    devices,
    filtered,
    stats,
    loading,
    error,
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    resetFilters,
    showAdd,
    setShowAdd,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    addDevice,
    removeDevice,
    setDeviceState,
    reload: load,
  }
}

export default useDevicesVM
