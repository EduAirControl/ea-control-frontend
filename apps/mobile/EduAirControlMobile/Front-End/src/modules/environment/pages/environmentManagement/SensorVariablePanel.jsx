import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import { useSensorPanelVM } from '../../viewmodels/useSensorPanelVM.js'
import { VARIABLE_META, TONE_COLORS } from '../../services/sensorService.js'
import Modal from '../../../../shared/components/Modal/Modal.jsx'
import Input from '../../../../shared/components/Input/Input.jsx'
import Button from '../../../../shared/components/Button/Button.jsx'
import { useToast } from '../../../../shared/components/Toast/Toast.jsx'
import { styles } from './SensorVariablePanel.styles'

const STATUS_META = {
  active: { key: 'sensors.statusActive', color: 'success' },
  offline: { key: 'sensors.statusOffline', color: 'error' },
  uninstalled: { key: 'sensors.statusUninstalled', color: 'warning' },
}

function Chip({ label, active, color, onPress, currentColors }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { borderColor: currentColors.borderColor, backgroundColor: currentColors.bgCard },
        active && { borderColor: color, backgroundColor: currentColors.accent === color ? currentColors.accentDim : `${color}1F` },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? color : currentColors.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function SummaryCell({ label, value, color, currentColors }) {
  return (
    <View style={[styles.summaryCell, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: currentColors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function formatInstant(iso, fallback) {
  if (!iso) return fallback
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString()
}

export default function SensorVariablePanel() {
  const { currentColors: c } = useTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const vm = useSensorPanelVM()

  const openAdd = () => {
    vm.setForm({
      serial: '',
      modelId: vm.defaultModelId(),
      statusId: vm.defaultStatusId(),
      environmentId: vm.environments[0]?.id ?? '',
    })
    vm.setShowAdd(true)
  }

  const submitAdd = async () => {
    if (!String(vm.form.serial).trim()) {
      toast.error(t('sensors.requiredId'))
      return
    }
    if (!vm.form.modelId || !vm.form.statusId) {
      toast.error(t('sensors.requiredModel', 'Elige un modelo y un estado del catálogo'))
      return
    }
    try {
      await vm.addSensor(vm.form)
      toast.success(t('sensors.added'))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const submitEdit = async () => {
    if (!vm.editing?.modelId || !vm.editing?.statusId) {
      toast.error(t('sensors.requiredModel', 'Elige un modelo y un estado del catálogo'))
      return
    }
    try {
      await vm.saveSensor(vm.editing)
      toast.success(t('sensors.updated'))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const doToggle = async (sensor) => {
    try {
      await vm.toggleSensor(sensor)
      toast.success(t('sensors.toggleDone'))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const doUninstall = async (sensor) => {
    try {
      await vm.uninstallSensor(sensor)
      toast.success(t('sensors.uninstallDone', 'Dispositivo desvinculado del ambiente'))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const renderSensorCard = (sensor) => {
    const status = STATUS_META[sensor.uiStatus] || STATUS_META.active
    const statusColor = c[status.color]

    return (
      <View key={sensor.id} style={[styles.sensorCard, { backgroundColor: c.bgCard, borderColor: c.borderColor, borderLeftColor: statusColor }]}>
        <View style={styles.sensorTop}>
          <View style={[styles.sensorIcon, { backgroundColor: `${c.accent}1F` }]}>
            <Ionicons name="hardware-chip-outline" size={18} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sensorId, { color: c.textPrimary }]} numberOfLines={1}>{sensor.serialNumber || sensor.sensorId}</Text>
            <Text style={[styles.sensorSync, { color: c.textMuted }]}>
              {sensor.lastSeenAt
                ? t('sensors.synced', { time: formatInstant(sensor.lastSeenAt, '') })
                : t('sensors.neverSeen', 'Nunca ha reportado')}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}1F`, borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{t(status.key)}</Text>
          </View>
        </View>

        <View style={styles.sensorGrid}>
          <View style={styles.sensorCell}>
            <Text style={[styles.cellLabel, { color: c.textMuted }]}>{t('sensors.colModel')}</Text>
            <Text style={[styles.cellValue, { color: c.textPrimary }]} numberOfLines={1}>
              {sensor.modelName}
            </Text>
          </View>
          <View style={styles.sensorCell}>
            <Text style={[styles.cellLabel, { color: c.textMuted }]}>{t('sensors.colEnvironment')}</Text>
            <Text style={[styles.cellValue, { color: c.textPrimary }]} numberOfLines={1}>
              {vm.getEnvironmentName(sensor.environmentId)}
            </Text>
          </View>
          <View style={styles.sensorCell}>
            <Text style={[styles.cellLabel, { color: c.textMuted }]}>{t('sensors.colInstalled')}</Text>
            <Text style={[styles.cellValue, { color: c.textPrimary }]}>
              {sensor.installedAt ? formatInstant(sensor.installedAt, '—') : '—'}
            </Text>
          </View>
          <View style={styles.sensorCell}>
            <Text style={[styles.cellLabel, { color: c.textMuted }]}>{t('sensors.colStatus')}</Text>
            <Text style={[styles.cellValue, { color: statusColor }]}>
              {t(status.key)}
            </Text>
          </View>
        </View>

        <View style={[styles.sensorActions, { borderTopColor: c.borderColor }]}>
          <TouchableOpacity
            style={styles.sensorActionBtn}
            onPress={() =>
              vm.setEditing({
                id: sensor.id,
                serialNumber: sensor.serialNumber,
                modelId: sensor.modelId,
                statusId: sensor.statusId,
                environmentId: sensor.environmentId ? String(sensor.environmentId) : '',
              })
            }
          >
            <Ionicons name="create-outline" size={15} color={c.accent} />
            <Text style={[styles.sensorActionTxt, { color: c.accent }]}>{t('sensors.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sensorActionBtn} onPress={() => doToggle(sensor)}>
            <Ionicons name="power-outline" size={15} color={sensor.statusCode === 'ACTIVE' ? c.error : c.success} />
            <Text style={[styles.sensorActionTxt, { color: sensor.statusCode === 'ACTIVE' ? c.error : c.success }]}>
              {sensor.statusCode === 'ACTIVE' ? t('sensors.toggleOff') : t('sensors.toggleOn')}
            </Text>
          </TouchableOpacity>
          {sensor.installed && (
            <TouchableOpacity style={styles.sensorActionBtn} onPress={() => doUninstall(sensor)}>
              <Ionicons name="unlink-outline" size={15} color={c.warning} />
              <Text style={[styles.sensorActionTxt, { color: c.warning }]}>{t('sensors.uninstall', 'Desvincular')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const hasFilters = vm.search.length > 0 || vm.statusFilter !== 'all'

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: c.accent }]}>{t('sensors.eyebrow')}</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>{t('sensors.title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('sensors.subtitle')}</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnTxt}>{t('management.addBtn')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCell label={t('sensors.summaryTotal')} value={vm.summary.total} color={c.textPrimary} currentColors={c} />
        <SummaryCell label={t('sensors.summaryActive')} value={vm.summary.active} color={c.success} currentColors={c} />
        <SummaryCell label={t('sensors.summaryOffline')} value={vm.summary.offline} color={c.error} currentColors={c} />
        <SummaryCell label={t('sensors.summaryUninstalled', 'Sin instalar')} value={vm.summary.uninstalled} color={c.warning} currentColors={c} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          placeholder={t('sensors.searchPlaceholderDevice', 'Buscar serial, modelo o ambiente…')}
          placeholderTextColor={c.textMuted}
          value={vm.search}
          onChangeText={vm.setSearch}
        />
        {vm.search.length > 0 && (
          <TouchableOpacity onPress={() => vm.setSearch('')}>
            <Ionicons name="close-circle" size={16} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipRow}>
        <Chip label={t('sensors.filterAllStatuses')} active={vm.statusFilter === 'all'} color={c.accent} onPress={() => vm.setStatusFilter('all')} currentColors={c} />
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Chip
            key={key}
            label={t(meta.key)}
            active={vm.statusFilter === key}
            color={c[meta.color]}
            onPress={() => vm.setStatusFilter(key)}
            currentColors={c}
          />
        ))}
      </View>

      {vm.loading ? (
        <ActivityIndicator style={{ marginVertical: 30 }} color={c.accent} />
      ) : vm.error ? (
        <View style={[styles.empty, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
          <Ionicons name="cloud-offline-outline" size={26} color={c.error} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>{vm.error}</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: c.accent }]} onPress={vm.reload}>
            <Text style={styles.emptyBtnTxt}>{t('common.retry', 'Reintentar')}</Text>
          </TouchableOpacity>
        </View>
      ) : vm.filtered.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
          <Ionicons name="hardware-chip-outline" size={26} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>{t('sensors.empty')}</Text>
          {hasFilters && (
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: c.accent }]} onPress={vm.resetFilters}>
              <Text style={styles.emptyBtnTxt}>{t('filters.clear')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        vm.filtered.map(renderSensorCard)
      )}

      <View style={[styles.variablesCard, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
        <Text style={[styles.kicker, { color: c.accent }]}>{t('sensors.monitored')}</Text>
        <Text style={[styles.subtitle, { color: c.textPrimary, marginTop: 2 }]}>{t('sensors.monitoredHint')}</Text>
        <View style={styles.chipRow}>
          {Object.entries(VARIABLE_META).map(([key, meta]) => {
            const tone = TONE_COLORS[meta.tone]
            return (
              <View key={key} style={[styles.varChip, { borderColor: `${tone}55`, backgroundColor: `${tone}14` }]}>
                <Ionicons name={meta.icon} size={16} color={tone} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.varChipTitle, { color: c.textPrimary }]}>{t(meta.labelKey)}</Text>
                  <Text style={[styles.varChipSub, { color: c.textMuted }]}>{t('sensors.unitRange', { unit: meta.unit })}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <Modal isOpen={vm.showAdd} onClose={() => vm.setShowAdd(false)} title={t('sensors.addTitle')}>
        <Text style={[styles.modalHint, { color: c.textMuted }]}>{t('sensors.newDevice')}</Text>
        <Input
          label={t('sensors.idLabel')}
          value={vm.form.serial}
          onChangeText={(v) => vm.setForm((p) => ({ ...p, serial: v }))}
          placeholder={t('sensors.idPlaceholder')}
          autoCapitalize="characters"
        />
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{t('sensors.modelLabel', 'Modelo')}</Text>
        <View style={styles.chipRow}>
          {vm.models.map((model) => (
            <Chip
              key={model.sensorModelId ?? model.id}
              label={model.name || model.code}
              active={vm.form.modelId === (model.sensorModelId ?? model.id)}
              color={c.accent}
              onPress={() => vm.setForm((p) => ({ ...p, modelId: model.sensorModelId ?? model.id }))}
              currentColors={c}
            />
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{t('sensors.envLabel')}</Text>
        <View style={styles.chipRow}>
          {vm.environments.map((env) => (
            <Chip
              key={env.id}
              label={env.nameKey ? t(env.nameKey) : env.name}
              active={String(vm.form.environmentId) === String(env.id)}
              color={c.accent}
              onPress={() => vm.setForm((p) => ({ ...p, environmentId: p.environmentId === env.id ? '' : env.id }))}
              currentColors={c}
            />
          ))}
        </View>
        <View style={styles.modalActions}>
          <Button variant="outline" onPress={() => vm.setShowAdd(false)}>{t('sensors.cancelBtn')}</Button>
          <Button onPress={submitAdd}>{t('sensors.saveSensor')}</Button>
        </View>
      </Modal>

      <Modal isOpen={Boolean(vm.editing)} onClose={() => vm.setEditing(null)} title={t('sensors.editTitle')} size="sm">
        {vm.editing && (
          <>
            <Text style={[styles.modalHint, { color: c.textPrimary, fontWeight: '800' }]}>{vm.editing.serialNumber}</Text>
            <Text style={[styles.modalHint, { color: c.textMuted, marginTop: 4 }]}>{t('sensors.editSubtitleDevice', 'Cambia el modelo, el estado o el ambiente del dispositivo.')}</Text>
            <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 14 }]}>{t('sensors.modelLabel', 'Modelo')}</Text>
            <View style={styles.chipRow}>
              {vm.models.map((model) => (
                <Chip
                  key={model.sensorModelId ?? model.id}
                  label={model.name || model.code}
                  active={vm.editing.modelId === (model.sensorModelId ?? model.id)}
                  color={c.accent}
                  onPress={() => vm.setEditing((p) => ({ ...p, modelId: model.sensorModelId ?? model.id }))}
                  currentColors={c}
                />
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 10 }]}>{t('sensors.colStatus')}</Text>
            <View style={styles.chipRow}>
              {vm.statuses.map((status) => (
                <Chip
                  key={status.sensorStatusId ?? status.id}
                  label={status.name || status.code}
                  active={vm.editing.statusId === (status.sensorStatusId ?? status.id)}
                  color={status.code === 'ACTIVE' ? c.success : c.error}
                  onPress={() => vm.setEditing((p) => ({ ...p, statusId: status.sensorStatusId ?? status.id }))}
                  currentColors={c}
                />
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 10 }]}>{t('sensors.envLabel')}</Text>
            <View style={styles.chipRow}>
              {vm.environments.map((env) => (
                <Chip
                  key={env.id}
                  label={env.nameKey ? t(env.nameKey) : env.name}
                  active={String(vm.editing.environmentId) === String(env.id)}
                  color={c.accent}
                  onPress={() =>
                    vm.setEditing((p) => ({
                      ...p,
                      environmentId: p.environmentId === env.id ? '' : env.id,
                    }))
                  }
                  currentColors={c}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => vm.setEditing(null)}>{t('sensors.cancelBtn')}</Button>
              <Button onPress={submitEdit}>{t('sensors.saveChanges')}</Button>
            </View>
          </>
        )}
      </Modal>
    </View>
  )
}
