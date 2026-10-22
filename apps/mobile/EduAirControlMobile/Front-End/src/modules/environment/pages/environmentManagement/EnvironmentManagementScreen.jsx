import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import { useManagementVM } from '../../viewmodels/useManagementVM.js'
import { getEnvironmentStatus } from '../../utils/getEnvironmentStatus.js'
import authService from '../../../auth/services/authService.js'
import environmentService from '../../services/environmentService.js'
import Button from '../../../../shared/components/Button/Button.jsx'
import Modal from '../../../../shared/components/Modal/Modal.jsx'
import Input from '../../../../shared/components/Input/Input.jsx'
import { useToast } from '../../../../shared/components/Toast/Toast.jsx'
import CampusManagementPanel from './CampusManagementPanel.jsx'
import SensorVariablePanel from './SensorVariablePanel.jsx'
import { styles } from './EnvironmentManagementScreen.styles'
import { useEnvironments } from '../../../../context/EnvironmentContext.jsx'

const TABS = [
  { id: 'environments', key: 'management.tabEnvironments', icon: 'business-outline' },
  { id: 'sensors', key: 'management.tabSensors', icon: 'hardware-chip-outline' },
  { id: 'campuses', label: 'Campuses', icon: 'business-outline' },
  { id: 'provisioning', key: 'management.tabProvisioning', icon: 'wifi-outline' },
]

function SummaryCard({ label, value, iconName, accent, active, onPress, currentColors }) {
  return (
    <TouchableOpacity
      style={[
        styles.summaryCard,
        { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor },
        active && { borderColor: accent, backgroundColor: `${accent}18` },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={active ? accent : currentColors.textMuted}
        style={styles.summaryIcon}
      />
      <Text style={[styles.summaryValue, { color: active ? accent : currentColors.textPrimary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: active ? accent : currentColors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function EnvironmentCard({ environment, onEdit, onDelete, currentColors, t }) {
  const status = getEnvironmentStatus(environment.statusKey, t, currentColors)
  const fmt = (value, unit) => (value === undefined || value === null ? `—${unit}` : `${value}${unit}`)

  const metrics = [
    { key: 'temp', icon: 'thermometer-outline', label: t('dashboard.temperature'), value: fmt(environment.temp, '°C') },
    { key: 'humidity', icon: 'water-outline', label: t('dashboard.humidity'), value: fmt(environment.humidity, '%') },
    { key: 'co2', icon: 'cloud-outline', label: t('allEnvironments.co2'), value: fmt(environment.co2, 'ppm') },
    { key: 'noise', icon: 'volume-high-outline', label: t('dashboard.noise'), value: fmt(environment.noise, 'dB') },
  ]

  return (
    <View
      style={[
        styles.envCard,
        {
          backgroundColor: currentColors.bgCard,
          borderColor: currentColors.borderColor,
          borderLeftColor: status.color,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: status.bg }]}>
          <Ionicons name="business-outline" size={18} color={status.color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: currentColors.textPrimary }]} numberOfLines={1}>
            {environment.name}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="location-outline" size={11} color={currentColors.textMuted} />
            <Text style={[styles.cardMetaTxt, { color: currentColors.textMuted }]} numberOfLines={1}>
              {environment.location || '—'}
            </Text>
            <Ionicons name="people-outline" size={11} color={currentColors.textMuted} style={{ marginLeft: 6 }} />
            <Text style={[styles.cardMetaTxt, { color: currentColors.textMuted }]}>{environment.capacity ?? '—'} p.</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={13} color={status.color} accessibilityElementsHidden />
          <Text style={[styles.statusTxt, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <View style={[styles.metricsRow, { borderTopColor: currentColors.borderColor }]}>
        {metrics.map((m) => (
          <View key={m.key} style={styles.metricCell}>
            <Ionicons name={m.icon} size={18} color={currentColors.accent} style={styles.metricIcon} />
            <Text style={[styles.metricValue, { color: currentColors.textPrimary }]}>{m.value}</Text>
            <Text style={[styles.metricLabel, { color: currentColors.textMuted }]}>{m.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.cardActions, { borderTopColor: currentColors.borderColor }]}>
        <TouchableOpacity style={[styles.editBtn, { borderRightColor: currentColors.borderColor }]} onPress={() => onEdit(environment)}>
          <Ionicons name="create-outline" size={14} color={currentColors.accent} />
          <Text style={[styles.editBtnTxt, { color: currentColors.accent }]}>{t('management.editBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(environment.id)}>
          <Ionicons name="trash-outline" size={14} color={currentColors.error} />
          <Text style={[styles.deleteBtnTxt, { color: currentColors.error }]}>{t('management.deleteBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function FilterBar({ vm, currentColors, t }) {
  const sorts = [
    { id: 'name', label: t('management.sortName') },
    { id: 'capacity', label: t('management.sortCapacity') },
    { id: 'status', label: t('management.sortStatus') },
  ]

  return (
    <View style={[styles.filterBar, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
      <Text style={[styles.filterBarLabel, { color: currentColors.textMuted }]}>{t('filters.sortLabel')}</Text>
      <View style={styles.sortRow}>
        {sorts.map((sort) => {
          const active = vm.sortBy === sort.id
          return (
            <TouchableOpacity
              key={sort.id}
              style={[
                styles.sortChip,
                { borderColor: currentColors.borderColor, backgroundColor: currentColors.bgCard },
                active && { borderColor: currentColors.accent, backgroundColor: currentColors.accentDim },
              ]}
              onPress={() => vm.setSortBy(sort.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? currentColors.accent : currentColors.textSecondary }}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.capacityRow}>
        <Text style={[styles.filterBarLabel, { color: currentColors.textMuted }]}>{t('management.capacity')}</Text>
        <View style={[styles.capacityInput, { borderColor: currentColors.borderColor, backgroundColor: currentColors.bgInput }]}>
          <Text style={[styles.capacityPrefix, { color: currentColors.textMuted }]}>{t('management.min')}</Text>
          <TextInput
            style={[styles.capacityTextInput, { color: currentColors.textPrimary }]}
            keyboardType="numeric"
            value={vm.minCapacity}
            onChangeText={vm.setMinCapacity}
            placeholder="0"
            placeholderTextColor={currentColors.textMuted}
          />
        </View>
        <View style={[styles.capacityInput, { borderColor: currentColors.borderColor, backgroundColor: currentColors.bgInput }]}>
          <Text style={[styles.capacityPrefix, { color: currentColors.textMuted }]}>{t('management.max')}</Text>
          <TextInput
            style={[styles.capacityTextInput, { color: currentColors.textPrimary }]}
            keyboardType="numeric"
            value={vm.maxCapacity}
            onChangeText={vm.setMaxCapacity}
            placeholder="—"
            placeholderTextColor={currentColors.textMuted}
          />
        </View>
        <TouchableOpacity onPress={() => { vm.setMinCapacity(''); vm.setMaxCapacity(''); vm.setSortBy('name') }}>
          <Text style={[styles.clearTxt, { color: currentColors.accent }]}>{t('filters.clear')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const EMPTY_FORM = {
  name: '',
  code: '',
  capacity: '',
  floor: '',
  campusId: '',
  environmentTypeId: '',
}

function ChipPicker({ label, options, value, onChange, currentColors, required, loading, error, onRetry }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: currentColors.textSecondary, marginBottom: 6 }}>
        {label}{required ? ' *' : ''}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => {
          const active = value === option.id
          return (
            <TouchableOpacity
              key={option.id}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: active ? currentColors.accent : currentColors.borderColor,
                backgroundColor: active ? currentColors.accentDim : currentColors.bgCard,
              }}
              onPress={() => onChange(active ? '' : option.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? currentColors.accent : currentColors.textSecondary }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
        {loading && (
          <Text style={{ fontSize: 12, color: currentColors.textMuted }}>Cargando…</Text>
        )}
        {!loading && error && (
          <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
            <Text style={{ fontSize: 12, color: currentColors.error }}>
              {error} · Reintentar
            </Text>
          </TouchableOpacity>
        )}
        {!loading && !error && options.length === 0 && (
          <Text style={{ fontSize: 12, color: currentColors.textMuted }}>Sin opciones disponibles</Text>
        )}
      </View>
    </View>
  )
}

export default function EnvironmentManagementScreen({ navigation }) {
  const { darkMode, currentColors } = useTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const { refreshEnvironments } = useEnvironments()
  const vm = useManagementVM()

  useFocusEffect(useCallback(() => {
    refreshEnvironments()
  }, [refreshEnvironments]))

  const [form, setForm] = useState(EMPTY_FORM)
  const [isEdit, setIsEdit] = useState(false)
  const [tab, setTab] = useState('environments')
  const [campuses, setCampuses] = useState([])
  const [envTypes, setEnvTypes] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(null)

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const [campusRows, typeRows] = await Promise.all([
        environmentService.getCampuses(),
        environmentService.getEnvironmentTypes(),
      ])
      setCampuses(campusRows.map((c) => ({ id: c.campusId ?? c.id, label: c.name })))
      setEnvTypes(typeRows.map((ty) => ({ id: ty.environmentTypeId ?? ty.id, label: ty.name })))
    } catch (e) {
      setCatalogError(e?.message || 'No se pudieron cargar las opciones')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    if (!authService.isAdmin()) {
      Alert.alert(
        t('management.title'),
        t('management.noAdmin', 'No tienes permisos para acceder a esta sección'),
      )
      navigation.replace('DashboardHome')
    }
  }, [navigation, t])

  const openAdd = () => {
    setIsEdit(false)
    setForm(EMPTY_FORM)
    vm.setShowAdd(true)
  }

  const openEdit = (env) => {
    setIsEdit(true)
    setForm({
      name: env.name || '',
      code: env.code || '',
      capacity: String(env.capacity ?? ''),
      floor: env.floor != null ? String(env.floor) : '',
      campusId: env.campusId || '',
      environmentTypeId: env.envType || '',
    })
    vm.setEditEnv(env)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('management.requiredName', 'El nombre es obligatorio'))
      return
    }
    if (!isEdit) {
      if (!form.code.trim()) {
        toast.error(t('management.requiredCode', 'El código es obligatorio'))
        return
      }
      if (!form.campusId) {
        toast.error(t('management.requiredCampus', 'Selecciona una sede'))
        return
      }
      if (!form.environmentTypeId) {
        toast.error(t('management.requiredType', 'Selecciona un tipo de ambiente'))
        return
      }
    }
    const capacity = Number(form.capacity)
    if (form.capacity !== '' && (Number.isNaN(capacity) || capacity < 1)) {
      toast.error(t('management.invalidCapacity', 'La capacidad debe ser 1 o más'))
      return
    }
    const data = {
      name: form.name.trim(),
      capacity: form.capacity === '' ? undefined : capacity,
      floor: form.floor === '' ? undefined : form.floor,
    }
    if (form.code.trim()) data.code = form.code.trim()
    if (form.campusId) data.campusId = form.campusId
    if (form.environmentTypeId) data.environmentTypeId = form.environmentTypeId
    const ok = isEdit && vm.editEnv
      ? await vm.handleEdit(vm.editEnv.id, data)
      : await vm.handleAdd(data)
    if (ok) toast.success(isEdit ? t('management.edited', 'Ambiente actualizado') : t('management.added', 'Ambiente agregado'))
  }

  const confirmDelete = async () => {
    if (!vm.deleteEnv) return
    const ok = await vm.handleDelete(vm.deleteEnv.id)
    if (ok) toast.success(t('management.deleted', 'Ambiente eliminado'))
  }

  const hasFilters = Boolean(vm.search) || vm.activeFilter !== 'all' || Boolean(vm.minCapacity) || Boolean(vm.maxCapacity)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentColors.bgBody }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={currentColors.bgBody} />

      <View
        style={[
          styles.header,
          {
            borderBottomColor: currentColors.borderColor,
            paddingTop: (StatusBar.currentHeight || 0) + 10,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="grid-outline" size={20} color={currentColors.accent} />
          <Text style={[styles.headerTitle, { color: currentColors.textPrimary }]}>{t('management.title')}</Text>
        </View>
        {tab === 'environments' && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: currentColors.accentButton || currentColors.accent }]} onPress={openAdd} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('management.addBtn')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.addBtnTxt, { color: '#fff' }]}>{t('management.addBtn')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tabBar, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabBtn, active && { backgroundColor: currentColors.accentDim, borderColor: currentColors.accent }]}
              onPress={() => {
                if (item.id === 'provisioning') {
                  navigation.navigate('Provisioning')
                  return
                }
                setTab(item.id)
              }}
              activeOpacity={0.85}
            >
              <Ionicons name={item.icon} size={15} color={active ? currentColors.accent : currentColors.textMuted} />
              <Text
                style={[styles.tabTxt, { color: active ? currentColors.accent : currentColors.textMuted }]}
              >
                {item.label || t(item.key)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {tab === 'campuses' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <CampusManagementPanel />
        </ScrollView>
      ) : tab === 'sensors' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <SensorVariablePanel />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.summaryRow}>
            <SummaryCard
              label={t('filterBar.all')} value={vm.stats.total} iconName="business-outline"
              accent={currentColors.accent} active={vm.activeFilter === 'all'} onPress={() => vm.setActiveFilter('all')} currentColors={currentColors}
            />
            <SummaryCard
              label={t('status.normal')} value={vm.stats.normals} iconName="checkmark-circle-outline"
              accent={currentColors.success} active={vm.activeFilter === 'normal'} onPress={() => vm.setActiveFilter('normal')} currentColors={currentColors}
            />
            <SummaryCard
              label={t('status.warning')} value={vm.stats.warnings} iconName="notifications-outline"
              accent={currentColors.warning} active={vm.activeFilter === 'warning'} onPress={() => vm.setActiveFilter('warning')} currentColors={currentColors}
            />
            <SummaryCard
              label={t('status.alert')} value={vm.stats.alerts} iconName="warning-outline"
              accent={currentColors.error} active={vm.activeFilter === 'alert'} onPress={() => vm.setActiveFilter('alert')} currentColors={currentColors}
            />
          </View>

          <View style={[styles.searchBar, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <Ionicons name="search-outline" size={16} color={currentColors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: currentColors.textPrimary }]}
              placeholder={t('filters.searchEnvironment')}
              placeholderTextColor={currentColors.textMuted}
              value={vm.search}
              onChangeText={vm.setSearch}
            />
            {vm.search.length > 0 && (
              <TouchableOpacity onPress={() => vm.setSearch('')}>
                <Ionicons name="close-circle" size={16} color={currentColors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FilterBar vm={vm} currentColors={currentColors} t={t} />

          <View style={styles.resultsInfo}>
            <Text style={[styles.resultsCount, { color: currentColors.textMuted }]}>
              {t('management.resultsCount')} {vm.filtered.length} {t('management.resultsOf')} {vm.stats.total}{' '}
              {t('management.resultsEnvironments')}
            </Text>
            {hasFilters && (
              <TouchableOpacity
                onPress={() => {
                  vm.setSearch('')
                  vm.setActiveFilter('all')
                  vm.setMinCapacity('')
                  vm.setMaxCapacity('')
                  vm.setSortBy('name')
                }}
              >
                <Text style={[styles.clearTxt, { color: currentColors.accent }]}>{t('filters.clear')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {vm.filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="business-outline"
                size={48}
                color={currentColors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>
                {vm.stats.total === 0 ? t('management.noResults') : t('management.noResultsSearch')}
              </Text>
              <Text style={[styles.emptySub, { color: currentColors.textMuted }]}>
                {vm.stats.total === 0 ? t('management.noResultsSub') : t('management.noResultsSearchSub')}
              </Text>
              {vm.stats.total === 0 ? (
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: currentColors.accentButton || currentColors.accent }]} onPress={openAdd}>
                  <Text style={[styles.emptyBtnTxt, { color: '#fff' }]}>{t('management.addBtn')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: currentColors.accentButton || currentColors.accent }]}
                  onPress={() => {
                    vm.setSearch('')
                    vm.setActiveFilter('all')
                    vm.setMinCapacity('')
                    vm.setMaxCapacity('')
                    vm.setSortBy('name')
                  }}
                >
                  <Text style={[styles.emptyBtnTxt, { color: '#fff' }]}>{t('management.clearSearch')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : vm.filtered.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              currentColors={currentColors}
              onEdit={openEdit}
              onDelete={vm.openDelete}
              t={t}
            />
          ))}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <Modal
        isOpen={vm.showAdd || Boolean(vm.editEnv)}
        onClose={() => { vm.setShowAdd(false); vm.setEditEnv(null) }}
        title={isEdit ? t('management.editTitle') : t('management.addTitle')}
      >
        <Input
          label={t('management.nameLabel')}
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          placeholder={t('management.namePlaceholder')}
        />
        <Input
          label={`${t('management.codeLabel', 'Código')}${isEdit ? '' : ' *'}`}
          value={form.code}
          onChangeText={(v) => setForm((p) => ({ ...p, code: v }))}
          placeholder={t('management.codePlaceholder', 'Ej. A-102')}
          autoCapitalize="characters"
        />
        <Input
          label={t('management.capacityLabel')}
          value={form.capacity}
          onChangeText={(v) => setForm((p) => ({ ...p, capacity: v }))}
          placeholder={t('management.capacityPlaceholder')}
          keyboardType="numeric"
        />
        <Input
          label={t('management.floorLabel', 'Piso')}
          value={form.floor}
          onChangeText={(v) => setForm((p) => ({ ...p, floor: v }))}
          placeholder={t('management.floorPlaceholder', 'Ej. 1')}
          keyboardType="numeric"
        />
        <ChipPicker
          label={t('management.campusLabel', 'Sede')}
          required={!isEdit}
          options={campuses}
          value={form.campusId}
          onChange={(v) => setForm((p) => ({ ...p, campusId: v }))}
          currentColors={currentColors}
          loading={catalogLoading}
          error={catalogError}
          onRetry={loadCatalogs}
        />
        <ChipPicker
          label={t('management.typeLabel', 'Tipo de ambiente')}
          required={!isEdit}
          options={envTypes}
          value={form.environmentTypeId}
          onChange={(v) => setForm((p) => ({ ...p, environmentTypeId: v }))}
          currentColors={currentColors}
          loading={catalogLoading}
          error={catalogError}
          onRetry={loadCatalogs}
        />
        <View style={styles.modalActions}>
          <Button variant="outline" onPress={() => { vm.setShowAdd(false); vm.setEditEnv(null) }}>
            {t('management.cancelBtn')}
          </Button>
          <Button onPress={handleSave}>
            {isEdit ? t('management.saveBtn') : t('management.addConfirmBtn')}
          </Button>
        </View>
      </Modal>

      <Modal
        isOpen={Boolean(vm.deleteEnv)}
        onClose={() => vm.setDeleteEnv(null)}
        title={t('management.deleteTitle')}
        size="sm"
      >
        <Text style={[styles.deleteMsg, { color: currentColors.textSecondary }]}>
          {t('management.deleteMsg', { name: vm.deleteEnv?.name })}
        </Text>
        <View style={styles.modalActions}>
          <Button variant="outline" onPress={() => vm.setDeleteEnv(null)}>
            {t('management.cancelBtn')}
          </Button>
          <Button variant="danger" onPress={confirmDelete}>
            {t('management.deleteBtn')}
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
