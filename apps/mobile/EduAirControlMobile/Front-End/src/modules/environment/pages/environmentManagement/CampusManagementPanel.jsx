import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useToast } from '../../../../shared/components/Toast/Toast.jsx'
import authService from '../../../auth/services/authService.js'
import apiClient from '../../../../shared/services/apiClient.js'
import { styles } from './CampusManagementPanel.styles.js'

function unwrap(data) {
  if (Array.isArray(data)) return data
  return data?.data || []
}

export default function CampusManagementPanel() {
  const { currentColors: c } = useTheme()
  const toast = useToast()
  const hasInstitution = Boolean(authService.getUser()?.institutionId)
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', city: '' })

  const loadCampuses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/v1/campuses', { params: { limit: 100 } })
      setCampuses(unwrap(response).map((campus) => ({
        id: campus.campusId ?? campus.id,
        code: campus.code,
        name: campus.name,
        city: campus.city,
        status: campus.status,
      })))
    } catch (error) {
      toast.error(error.message || 'No fue posible cargar los campuses.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadCampuses() }, [loadCampuses])

  const createCampus = async () => {
    if (!form.code.trim() || !form.name.trim() || !hasInstitution) return
    setSaving(true)
    try {
      await apiClient.post('/api/v1/campuses', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        status: 'ACTIVE',
      })
      setForm({ code: '', name: '', city: '' })
      toast.success('Campus creado y asignado a tu institución.')
      await loadCampuses()
    } catch (error) {
      toast.error(error.message || 'No fue posible crear el campus.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, placeholder, required = false, maxLength = 150) => (
    <View style={styles.field} key={key}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}{required ? ' *' : ''}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        maxLength={maxLength}
        editable={hasInstitution && !saving}
        autoCapitalize={key === 'code' ? 'characters' : 'words'}
        style={[styles.input, { color: c.textPrimary, backgroundColor: c.bgBody, borderColor: c.borderColor }]}
      />
    </View>
  )

  return (
    <View style={[styles.panel, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>GESTIÓN DE SEDES</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>Campuses de mi institución</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>Crea y consulta las sedes asociadas a tu institución.</Text>
        </View>
        <View style={[styles.count, { backgroundColor: c.accentDim }]}>
          <Ionicons name="business-outline" size={15} color={c.accent} />
          <Text style={[styles.countText, { color: c.accent }]}>{campuses.length}</Text>
        </View>
      </View>

      {!hasInstitution && (
        <View style={[styles.notice, { backgroundColor: c.warningDim, borderColor: c.warning }]}>
          <Text style={[styles.noticeText, { color: c.warning }]}>Tu cuenta no tiene una institución asignada. Solicita que la asocien antes de crear un campus.</Text>
        </View>
      )}

      <View style={[styles.form, { backgroundColor: c.bgSubtle }]}>
        {field('Código', 'code', 'Ej. SEDE-NORTE', true, 30)}
        {field('Nombre', 'name', 'Ej. Campus Norte', true, 150)}
        {field('Ciudad', 'city', 'Ej. Bogotá', false, 100)}
        <TouchableOpacity
          style={[styles.submit, { backgroundColor: c.accentButton || c.accent, opacity: !hasInstitution || saving || !form.code.trim() || !form.name.trim() ? 0.5 : 1 }]}
          disabled={!hasInstitution || saving || !form.code.trim() || !form.name.trim()}
          onPress={createCampus}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={18} color="#fff" />}
          <Text style={[styles.submitText, { color: c.textOnAccent || '#fff' }]}>{saving ? 'Guardando…' : 'Crear campus'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: c.textPrimary }]}>Sedes registradas</Text>
        <TouchableOpacity onPress={loadCampuses} disabled={loading}>
          <Text style={[styles.refresh, { color: c.accent }]}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={styles.loader} />
      ) : campuses.length === 0 ? (
        <View style={[styles.empty, { borderColor: c.borderColor }]}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Aún no hay campuses para tu institución.</Text>
        </View>
      ) : campuses.map((campus) => (
        <View key={campus.id} style={[styles.campusCard, { borderColor: c.borderColor }]}>
          <View style={[styles.campusIcon, { backgroundColor: c.accentDim }]}>
            <Ionicons name="business-outline" size={18} color={c.accent} />
          </View>
          <View style={styles.campusInfo}>
            <Text style={[styles.campusName, { color: c.textPrimary }]}>{campus.name}</Text>
            <Text style={[styles.campusMeta, { color: c.textMuted }]}>{campus.code}{campus.city ? ` · ${campus.city}` : ''}</Text>
          </View>
          <Text style={[styles.status, { color: campus.status === 'ACTIVE' ? c.success : c.textMuted }]}>
            {campus.status === 'ACTIVE' ? 'Activo' : campus.status || '—'}
          </Text>
        </View>
      ))}
    </View>
  )
}
