import { useState } from 'react'
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
import deviceService from '../../services/deviceService.js'
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

  const registeredDevice = route.params?.device || null
  const [mac, setMac] = useState(registeredDevice?.macAddress || null)
  const [saving, setSaving] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleScan = async () => {
    const device = await vm.startScan()
    if (device) setMac((prev) => prev || device.id?.toUpperCase() || null)
  }

  const handleSend = async () => {
    const result = await vm.submit()
    if (result === 'connected') toast.success(t('provisioning.toasts.connected'))
    else if (result === 'fail') toast.error(t('devices.errors.wifiFail'))
  }

  const syncBackend = async () => {
    setSaving(true)
    try {
      if (registeredDevice) {
        await deviceService.update(registeredDevice.id, {
          macAddress: registeredDevice.macAddress,
          nombre: registeredDevice.nombre,
          tipo: registeredDevice.tipo,
          idAula: registeredDevice.idAula,
          ssid: vm.ssid.trim(),
          estado: 'conectado',
          firmwareVersion: registeredDevice.firmwareVersion,
        })
      } else {
        if (!mac) {
          toast.error(t('devices.errors.mac'))
          return
        }
        await deviceService.create({
          macAddress: mac.toUpperCase(),
          nombre: t('devices.newDeviceName', { mac }),
          tipo: 'esp32',
          ssid: vm.ssid.trim(),
          estado: 'conectado',
        })
      }
      setRegistered(true)
      toast.success(t('provisioning.toasts.saved'))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const statusKey = vm.phase === 'error' && vm.errorKey ? vm.errorKey : PHASE_STATUS[vm.phase]
  const success = vm.phase === 'success'
  const canSend = vm.phase === 'ready'

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
                {mac || registeredDevice?.macAddress || '—'}
              </Text>
              <Text style={[styles.deviceName, { color: c.textMuted }]} numberOfLines={1}>
                {registeredDevice?.nombre || t('devices.noName')}
                {registeredDevice?.ssid ? ` · ${registeredDevice.ssid}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: vm.phase === 'error' ? c.error : c.borderCard }]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: success ? c.success : vm.phase === 'error' ? c.error : c.accent },
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
            loading={vm.phase === 'sending' || vm.phase === 'waiting'}
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
            {!registered && (
              <Button onPress={syncBackend} loading={saving} icon={<Ionicons name="cloud-upload-outline" size={16} color="#fff" />} iconPosition="left">
                {t('provisioning.registerBtn')}
              </Button>
            )}
            {registered && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Devices')}>
                <Text style={[styles.linkTxt, { color: c.accent }]}>{t('provisioning.backToDevices')}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.accent} />
              </TouchableOpacity>
            )}
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
