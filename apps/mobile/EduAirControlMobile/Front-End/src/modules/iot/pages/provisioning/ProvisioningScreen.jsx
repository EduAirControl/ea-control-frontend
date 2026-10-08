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
import { useDevicesVM } from '../../viewmodels/useDevicesVM.js'
import { useEnvironment } from '../../../../context/EnvironmentContext.jsx'
import Input from '../../../../shared/components/Input/Input.jsx'
import Button from '../../../../shared/components/Button/Button.jsx'
import { useToast } from '../../../../shared/components/Toast/Toast.jsx'
import { styles } from './ProvisioningScreen.styles'

const PHASE_STATUS = {
  idle: 'provisioning.status.idle',
  scanning: 'provisioning.status.scanning',
  connecting: 'provisioning.status.connecting',
  ready: 'provisioning.status.ready',
  resolving: 'provisioning.status.resolving',
  sending: 'provisioning.status.sending',
  waiting: 'provisioning.status.waiting',
  provisioning: 'provisioning.status.provisioning',
  success: 'provisioning.status.success',
  error: 'provisioning.status.error',
}

/** Fases que habilitan el boton de envio. */
const CAN_SEND = new Set(['ready'])

export default function ProvisioningScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { currentColors: c } = useTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const vm = useProvisioningVM()
  const devices = useDevicesVM()
  const { environments } = useEnvironment()

  const registeredDevice = route.params?.device || null
  const [environmentId, setEnvironmentId] = useState(
    registeredDevice?.idAula || environments?.[0]?.id || ''
  )
  const [showEnvironments, setShowEnvironments] = useState(false)

  // Los ambientes llegan de forma asincrona via EnvironmentContext; si el primero
  // no estaba cargado al montar, se toma cuando llega.
  useEffect(() => {
    if (!environmentId && environments?.length) {
      setEnvironmentId(registeredDevice?.idAula || environments[0].id)
    }
  }, [environments, environmentId, registeredDevice])

  const handleScan = async () => {
    const device = await vm.startScan()
    if (device && !environmentId && environments?.length) {
      setEnvironmentId(environments[0].id)
    }
  }

  const handleSend = async () => {
    const selected = environments?.find((e) => e.id === environmentId)
    const result = await vm.submit({
      educationalEnvironmentId: environmentId,
      name: registeredDevice?.nombre || selected?.name || null,
    })
    if (result === 'connected') {
      toast.success(t('provisioning.toasts.provisioned'))
      devices.reload()
    } else if (result === 'fail') {
      toast.error(t('devices.errors.wifiFail'))
    }
  }

  const statusKey = vm.phase === 'error' && vm.errorKey ? vm.errorKey : PHASE_STATUS[vm.phase]
  const success = vm.phase === 'success'
  const canSend = CAN_SEND.has(vm.phase)
  const selectedEnvironment = environments?.find((e) => e.id === environmentId)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bgBody }]}>
      <StatusBar barStyle="dark-content" backgroundColor={c.bgBody} />

      <View style={[styles.header, { borderBottomColor: c.borderColor }]}>
        <TouchableOpacity onPress={() => { vm.cleanup(); navigation.goBack() }} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{t('provisioning.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistType="worked">
        <Text style={[styles.intro, { color: c.textSecondary }]}>{t('provisioning.subtitle')}</Text>

        {/* Paso 0 - ambiente destino: define que sensores puede publicar el nodo */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: showEnvironments ? c.accent : c.borderCard }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>
            {t('provisioning.environmentLabel')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowEnvironments((v) => !v)}
            style={[styles.select, { backgroundColor: c.bgCardAlt || c.bgCard, borderColor: c.borderColor }]}
            disabled={vm.isBusy || success}
          >
            <Text style={[styles.selectValue, { color: environmentId ? c.textPrimary : c.textMuted }]}>
              {selectedEnvironment?.name || t('provisioning.environmentPlaceholder')}
            </Text>
            <Ionicons name={showEnvironments ? 'chevron-up' : 'chevron-down'} size={16} color={c.textMuted} />
          </TouchableOpacity>

          {showEnvironments && (
            <View style={[styles.envList, { borderColor: c.borderColor }]}>
              {(environments || []).length === 0 ? (
                <Text style={[styles.envEmpty, { color: c.textMuted }]}>{t('provisioning.noEnvironments')}</Text>
              ) : (
                environments.map((env) => (
                  <TouchableOpacity
                    key={env.id}
                    onPress={() => { setEnvironmentId(env.id); setShowEnvironments(false) }}
                    style={[styles.envRow, { borderBottomColor: c.borderColor }]}
                  >
                    <Text style={[styles.envName, { color: c.textPrimary }]} numberOfLines={1}>
                      {env.name}
                    </Text>
                    <Text style={[styles.envCode, { color: c.textMuted }]}>{env.location}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {!selectedEnvironment && (
            <Text style={[styles.warn, { color: c.warning || c.accent }]}>
              {t('provisioning.errors.environment')}
            </Text>
          )}
        </View>

        {/* Paso 1 - enlace BLE */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: vm.phase === 'error' ? c.error : c.borderCard }]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: success ? c.success : vm.phase === 'error' ? c.error : c.accent },
              ]}
            />
            <Text style={[styles.statusText, { color: success ? c.success : vm.phase === 'error' ? c.error : c.textPrimary }]}>
              {t(statusKey, { defaultValue: statusKey })}
            </Text>
            {vm.isBusy && <ActivityIndicator size="small" color={c.accent} style={{ marginLeft: 'auto' }} />}
          </View>

          <View style={[styles.deviceRow, { borderColor: c.borderColor }]}>
            <Ionicons name="hardware-chip-outline" size={18} color={c.accent} />
            <Text style={[styles.deviceMac, { color: c.textPrimary }]}>
              {vm.deviceMac || registeredDevice?.macAddress || '—'}
            </Text>
          </View>

          <Button
            onPress={handleScan}
            disabled={vm.isBusy || canSend || success}
            loading={vm.phase === 'scanning' || vm.phase === 'connecting'}
            icon={<Ionicons name="bluetooth-outline" size={16} color="#fff" />}
            iconPosition="left"
          >
            {canSend ? t('provisioning.scanDone') : t('provisioning.scanBtn')}
          </Button>
        </View>

        {/* Paso 2 - credenciales */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.borderCard }]}>
          <Input
            label={t('provisioning.ssidLabel')}
            value={vm.ssid}
            onChangeText={vm.setSsid}
            placeholder={t('provisioning.ssidPlaceholder')}
            autoCapitalize="none"
            editable={!vm.isBusy && !success}
          />
          <View style={{ height: 12 }} />
          <Input
            label={t('provisioning.passwordLabel')}
            value={vm.password}
            onChangeText={vm.setPassword}
            placeholder={t('provisioning.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            editable={!vm.isBusy && !success}
          />
          <View style={{ height: 16 }} />
          <Button
            variant={canSend ? 'primary' : 'outline'}
            onPress={handleSend}
            disabled={!canSend || !environmentId || !vm.deviceMac}
            loading={['resolving', 'sending', 'waiting', 'provisioning'].includes(vm.phase)}
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
            <TouchableOpacity onPress={() => navigation.navigate('Devices')} style={styles.linkBtn}>
              <Text style={[styles.linkTxt, { color: c.accent }]}>{t('provisioning.backToDevices')}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* Registro tecnico */}
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