import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import { useProvisioningVM } from '../../viewmodels/useProvisioningVM.js'
import sensorService from '../../../environment/services/sensorService.js'
import environmentService from '../../../environment/services/environmentService.js'
import Input from '../../../../shared/components/Input/Input.jsx'
import Button from '../../../../shared/components/Button/Button.jsx'
import { useToast } from '../../../../shared/components/Toast/Toast.jsx'
import { styles } from './ProvisioningScreen.styles'

const PHASE_STATUS = {
  idle: 'provisioning.status.idle',
  scanning: 'provisioning.status.scanning',
  connecting: 'provisioning.status.connecting',
  ready: 'provisioning.status.ready',
  sending: 'provisioning.status.sending',
  waiting: 'provisioning.status.waiting',
  success: 'provisioning.status.success',
  error: 'provisioning.status.error',
}

export default function ProvisioningScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { currentColors: c } = useTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const vm = useProvisioningVM()

  const environmentId = route.params?.environmentId || null
  const [mac, setMac] = useState(route.params?.macAddress || null)
  const [saving, setSaving] = useState(false)
  const [deviceConfig, setDeviceConfig] = useState(null)

  // Catalogos de ms-sensor-management: el alta exige un modelo y un estado reales.
  const [models, setModels] = useState([])
  const [statuses, setStatuses] = useState([])
  const [environments, setEnvironments] = useState([])
  const [environmentsLoading, setEnvironmentsLoading] = useState(true)
  const [environmentsError, setEnvironmentsError] = useState(false)
  const [modelId, setModelId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [envId, setEnvId] = useState(environmentId || '')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      sensorService.listModels().then((list) => ({ list, failed: false }))
        .catch(() => ({ list: [], failed: true })),
      sensorService.listStatuses().then((list) => ({ list, failed: false }))
        .catch(() => ({ list: [], failed: true })),
      environmentService.getAll().then((list) => ({ list, failed: false }))
        .catch(() => ({ list: [], failed: true })),
    ])
      .then(([modelResult, statusResult, environmentResult]) => {
        if (cancelled) return
        const modelList = modelResult.list
        const statusList = statusResult.list
        const envList = environmentResult.list
        setModels(modelList)
        setStatuses(statusList)
        setEnvironments(envList)
        setEnvironmentsError(environmentResult.failed || modelResult.failed || statusResult.failed)
        setEnvironmentsLoading(false)
        // El modelo completo es el que lleva los tres modulos.
        const full = modelList.find((m) => m.code === 'ESP32_FULL') || modelList[0]
        if (full) setModelId(full.sensorModelId || full.id)
        const active = statusList.find((s) => s.code === 'ACTIVE') || statusList[0]
        if (active) setStatusId(active.sensorStatusId || active.id)
        setEnvId((current) => {
          if (current && envList.some((env) => String(env.id) === String(current))) return String(current)
          if (environmentId && envList.some((env) => String(env.id) === String(environmentId))) return String(environmentId)
          return envList.length === 1 ? String(envList[0].id) : ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          setEnvironmentsLoading(false)
          setEnvironmentsError(true)
          toast.error(t('sensors.catalogError', 'No se pudieron cargar los catálogos'))
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * El alta (sensor + instalación + token) solo vale para la combinación de
   * modelo, estado, ambiente y dispositivo con la que se hizo. La firma permite
   * detectar tanto los cambios normales como el caso de carrera en el que el
   * usuario cambia el ambiente mientras el registro sigue en vuelo: reutilizar
   * un `deviceConfig` desfasado mandaría al ESP32 un installationId del
   * ambiente que ya no está elegido.
   */
  const registrationKey = `${envId}|${modelId}|${statusId}|${mac}`

  useEffect(() => {
    setDeviceConfig(null)
  }, [registrationKey])

  const handleScan = async () => {
    const device = await vm.startScan()
    if (device) setMac((prev) => device.id?.toUpperCase() || prev)
  }

  /**
   * Da de alta el sensor, lo instala en el ambiente y pide su credencial.
   * Todo esto tiene que existir ANTES de enviar el payload por BLE: el ESP32
   * guarda el token y el installationId y luego envia con ellos.
   */
  const registerDevice = async () => {
    if (!mac) {
      toast.error(t('devices.errors.mac'))
      return null
    }
    if (!modelId || !statusId) {
      toast.error(t('provisioning.errors.model'))
      return null
    }
    if (!envId) {
      toast.error(t('provisioning.errors.environment'))
      return null
    }
    const selectedEnvironment = environments.find((env) => String(env.id) === String(envId))
    if (!selectedEnvironment?.id) {
      toast.error(t('provisioning.errors.environment', 'Selecciona un ambiente válido antes de continuar.'))
      return null
    }

    setSaving(true)
    try {
      const serial = mac.toUpperCase()
      const sensorIdOf = (sensor) => sensor.sensorId ?? sensor.id

      // Alta del sensor. Si el serial ya existe (reintento tras un fallo de BLE
      // o tras cambiar de ambiente), el 409 no aborta el flujo: se recupera el
      // sensor y se sigue con la instalación.
      let sensor = null
      try {
        sensor = await sensorService.create({
          sensorId: serial,
          sensorModelId: modelId,
          sensorStatusId: statusId,
        })
      } catch (e) {
        if (e.status !== 409) throw e
        sensor = await sensorService.findBySerial(serial)
        if (!sensor) throw e
      }

      // Instalación abierta del sensor: si apunta al ambiente elegido se
      // reutiliza; si apunta a otro (el usuario cambió el chip), se cierra y se
      // reinstala en el ambiente seleccionado.
      const openInstallations = await sensorService.listInstallations(sensorIdOf(sensor), { active: true })
      const open = openInstallations.find((row) => !row.removedAt)
      let installation = null
      if (open) {
        if (String(open.educationalEnvironmentId) === String(selectedEnvironment.id)) {
          installation = open
        } else {
          await sensorService.removeInstallation(open.sensorInstallationId ?? open.id)
        }
      }
      if (!installation) {
        installation = await sensorService.install(sensorIdOf(sensor), selectedEnvironment.id)
      }

      const installationId = installation?.sensorInstallationId || installation?.id
      const tokenResponse = await sensorService.requestDeviceToken(sensorIdOf(sensor))

      const config = {
        sensorId: sensorIdOf(sensor),
        installationId,
        token: tokenResponse?.accessToken,
        environmentId: String(selectedEnvironment.id),
        environmentName: selectedEnvironment.name,
        signature: registrationKey,
      }
      setDeviceConfig(config)
      toast.success(t('provisioning.toasts.saved'))
      return config
    } catch (e) {
      toast.error(e.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    const config = deviceConfig?.signature === registrationKey ? deviceConfig : await registerDevice()
    if (!config) return
    const result = await vm.submit(config)
    if (result === 'connected') toast.success(t('provisioning.toasts.connected'))
    else if (result === 'fail') toast.error(t('devices.errors.wifiFail'))
  }

  const statusKey = vm.phase === 'error' && vm.errorKey ? vm.errorKey : PHASE_STATUS[vm.phase]
  const success = vm.phase === 'success'
  const canSend = vm.phase === 'ready'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bgBody }]}>
      <StatusBar barStyle={c.dark ? 'light-content' : 'dark-content'} backgroundColor={c.bgBody} />

      <View style={[styles.header, { borderBottomColor: c.borderColor }]}>
        <TouchableOpacity onPress={() => { vm.cleanup(); navigation.goBack() }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back', 'Volver')}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{t('provisioning.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: c.textSecondary }]}>{t('provisioning.subtitle')}</Text>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>{t('provisioning.deviceLabel')}</Text>
          <View style={styles.deviceRow}>
            <View style={[styles.deviceIcon, { backgroundColor: c.accentDim }]}>
              <Ionicons name="hardware-chip-outline" size={18} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceMac, { color: c.textPrimary }]}>
                {mac || '—'}
              </Text>
              <Text style={[styles.deviceName, { color: c.textMuted }]} numberOfLines={1}>
                {t('devices.noName')}
                {vm.ssid ? ` · ${vm.ssid}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Modelo, estado y ambiente: el alta del sensor exige UUIDs reales. */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.borderColor }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>{t('provisioning.configLabel')}</Text>

          <Text style={[styles.hint, { color: c.textMuted }]}>{t('provisioning.modelLabel')}</Text>
          <View style={styles.profilesRow}>
            {models.map((m) => {
              const id = m.sensorModelId || m.id
              const active = id === modelId
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.profileBtn, { borderColor: c.borderColor, backgroundColor: c.bgCard }, active && { borderColor: c.accent, backgroundColor: c.accentDim }]}
                  onPress={() => setModelId(id)}
                  accessibilityRole="radio"
                  accessibilityLabel={m.name}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.profileBtnTxt, { color: active ? c.accent : c.textSecondary }, active && styles.profileBtnTxtActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.hint, { color: c.textMuted }]}>{t('provisioning.statusLabel')}</Text>
          <View style={styles.profilesRow}>
            {statuses.map((s) => {
              const id = s.sensorStatusId || s.id
              const active = id === statusId
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.profileBtn, { borderColor: c.borderColor, backgroundColor: c.bgCard }, active && { borderColor: c.accent, backgroundColor: c.accentDim }]}
                  onPress={() => setStatusId(id)}
                  accessibilityRole="radio"
                  accessibilityLabel={s.name}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.profileBtnTxt, { color: active ? c.accent : c.textSecondary }, active && styles.profileBtnTxtActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.hint, { color: c.textMuted }]}>{t('provisioning.environmentLabel')}</Text>
          <View style={styles.profilesRow}>
            {environments.map((env) => {
              const active = String(env.id) === String(envId)
              return (
                <TouchableOpacity
                  key={env.id}
                  style={[styles.profileBtn, { borderColor: c.borderColor, backgroundColor: c.bgCard }, active && { borderColor: c.accent, backgroundColor: c.accentDim }]}
                  onPress={() => setEnvId(String(env.id))}
                  accessibilityRole="radio"
                  accessibilityLabel={env.name}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.profileBtnTxt, { color: active ? c.accent : c.textSecondary }, active && styles.profileBtnTxtActive]}>
                    {env.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
            {environmentsLoading && <ActivityIndicator size="small" color={c.accent} />}
            {!environmentsLoading && environments.length === 0 && (
              <Text style={[styles.hint, { color: environmentsError ? c.error : c.textMuted }]}>
                {environmentsError
                  ? t('provisioning.errors.environmentsLoad', 'No se pudieron cargar los ambientes. Revisa la conexión e inténtalo de nuevo.')
                  : t('provisioning.noEnvironments')}
              </Text>
            )}
          </View>

          <Text style={[styles.hint, { color: c.textMuted }]}>
            {deviceConfig
              ? `${t('provisioning.registered', { id: deviceConfig.sensorId })}${
                  deviceConfig.environmentName
                    ? ` · ${t('provisioning.environmentLabel')}: ${deviceConfig.environmentName}`
                    : ''
                }`
              : t('provisioning.notRegistered')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: vm.phase === 'error' ? c.error : c.borderCard }]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: success ? c.success : vm.phase === 'error' ? c.error : c.accentButton || c.accent },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: success ? c.success : vm.phase === 'error' ? c.error : c.textPrimary },
              ]}
            >
              {t(statusKey, { defaultValue: statusKey })}
            </Text>
            {vm.isBusy && <ActivityIndicator size="small" color={c.accent} style={{ marginLeft: 'auto' }} />}
          </View>

          {/* Un fallo de BLE sin explicacion se parece demasiado a "esta cargando":
              aqui se dice que se puede volver a intentar. */}
          {vm.phase === 'error' && (
            <Text style={[styles.hint, { color: c.error }]}>
              {t('provisioning.errors.retryHint')}
            </Text>
          )}

          <Button
            onPress={handleScan}
            disabled={vm.isBusy || vm.phase === 'ready' || success}
            loading={vm.phase === 'scanning' || vm.phase === 'connecting'}
            icon={<Ionicons name="bluetooth-outline" size={16} color="#fff" />}
            iconPosition="left"
          >
            {t('provisioning.scanBtn')}
          </Button>

          <View style={{ height: 10 }} />

          <Input
            label={t('provisioning.ssidLabel')}
            value={vm.ssid}
            onChangeText={vm.setSsid}
            placeholder={t('provisioning.ssidPlaceholder')}
            autoCapitalize="none"
            editable={!success}
          />
          <Input
            label={t('provisioning.passwordLabel')}
            value={vm.password}
            onChangeText={vm.setPassword}
            placeholder={t('provisioning.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            editable={!success}
          />

          <Button
            variant={canSend ? 'primary' : 'outline'}
            onPress={handleSend}
            disabled={!canSend}
            loading={saving || vm.phase === 'sending' || vm.phase === 'waiting'}
            icon={<Ionicons name="send-outline" size={16} color={canSend ? '#fff' : c.textMuted} />}
            iconPosition="left"
          >
            {t('provisioning.sendBtn')}
          </Button>

          <Text style={[styles.hint, { color: c.textMuted }]}>{t('provisioning.hint')}</Text>
        </View>

        {success && (
          <View style={[styles.card, { backgroundColor: `${c.success}14`, borderColor: c.success }]}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color={c.success} />
              <Text style={[styles.statusText, { color: c.success, marginLeft: 8 }]}>
                {t('provisioning.successTitle')}
              </Text>
            </View>
            <Text style={[styles.successText, { color: c.textSecondary }]}>{t('provisioning.successBody')}</Text>
            {deviceConfig?.environmentName && (
              <Text style={[styles.successText, { color: c.textSecondary }]}>
                {t('provisioning.environmentLabel')}: {deviceConfig.environmentName}
              </Text>
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('ManagementHome')}>
              <Text style={[styles.linkTxt, { color: c.accent }]}>{t('provisioning.backToDevices')}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.accent} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.logCard, { backgroundColor: c.bgCardAlt || c.bgCard, borderColor: c.borderColor }]}>
          <View style={styles.logHeader}>
            <Ionicons name="terminal-outline" size={14} color={c.textMuted} />
            <Text style={[styles.logTitle, { color: c.textMuted }]}>{t('provisioning.logTitle')}</Text>
            {vm.log.length > 0 && (
              <TouchableOpacity onPress={vm.reset}>
                <Text style={[styles.logClear, { color: c.accent }]}>{t('provisioning.clear')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {vm.log.length === 0 ? (
            <Text style={[styles.logEmpty, { color: c.textMuted }]}>{t('provisioning.logEmpty')}</Text>
          ) : (
            vm.log.map((entry, index) => (
              <View key={`${entry.at}-${index}`} style={styles.logLine}>
                <Text style={[styles.logIndex, { color: c.textMuted }]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.logMsg, { color: entry.raw ? c.accent : c.textSecondary }]}>
                  {entry.raw || t(entry.key)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
