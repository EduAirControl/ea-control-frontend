import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import { useNotificationsVM } from '../../viewmodels/useNotificationsVM.js'
import { styles } from './NotificationsScreen.styles'

const TYPE_CONFIG = {
  danger: { icon: 'alert-circle', colorKey: 'error', bgKey: 'errorDim' },
  warning: { icon: 'warning', colorKey: 'warning', bgKey: 'warningDim' },
  info: { icon: 'information-circle', colorKey: 'info', bgKey: 'infoDim' },
}

const HOUR_LOCALES = { es: 'es-CO', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' }

function timeLabel(date, currentColors, lang) {
  const locale = HOUR_LOCALES[lang] || 'es-CO'
  try {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function NotificationItem({ notification, onPress, currentColors }) {
  const { i18n } = useTranslation()
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info
  const cfg = { ...config, color: currentColors[config.colorKey], bg: currentColors[config.bgKey] }

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!notification.envId}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      accessibilityState={{ disabled: !notification.envId }}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: currentColors.textPrimary }]}>{notification.title}</Text>
        <Text style={[styles.itemMsg, { color: currentColors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.itemTime, { color: currentColors.textMuted }]}>{timeLabel(notification.time, currentColors, i18n.language)}</Text>
      </View>
      {notification.envId && (
        <Ionicons name="chevron-forward" size={16} color={currentColors.textMuted} />
      )}
    </TouchableOpacity>
  )
}

export default function NotificationsScreen({ navigation }) {
  const { darkMode, currentColors } = useTheme()
  const { t } = useTranslation()
  const vm = useNotificationsVM()

  const filters = [
    { key: 'all', label: t('notifications.all', 'Todas') },
    { key: 'danger', label: t('notifications.alerts', 'Alertas') },
    { key: 'warning', label: t('notifications.warning') },
    { key: 'info', label: t('notifications.dailySummary') },
  ]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentColors.bgBody }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={currentColors.bgBody} />

      <View style={[styles.header, { backgroundColor: currentColors.bgCard, borderBottomColor: currentColors.borderColor }]}>
        <Ionicons name="notifications" size={24} color={currentColors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: currentColors.textPrimary }]}>{t('notifications.title')}</Text>
          {vm.unreadCount > 0 && (
              <Text style={[styles.headerSub, { color: currentColors.error }]}>
              {t('notifications.activeAlerts', '{{count}} alertas activas', { count: vm.unreadCount })}
            </Text>
          )}
        </View>
        {vm.unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: currentColors.errorButton || currentColors.error }]}>
            <Text style={styles.badgeText}>{vm.unreadCount}</Text>
          </View>
        )}
      </View>

      {vm.all.length > 0 && (
        <TouchableOpacity style={[styles.markReadRow, { borderBottomColor: currentColors.borderColor }]} onPress={vm.markAllRead} hitSlop={6}>
          <Ionicons name="checkmark-done-outline" size={16} color={currentColors.accent} />
          <Text style={[styles.markReadText, { color: currentColors.accent }]}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              { borderColor: currentColors.borderColor },
              vm.filter === f.key && { backgroundColor: currentColors.accentButton || currentColors.accent, borderColor: currentColors.accentButton || currentColors.accent },
            ]}
            onPress={() => vm.setFilter(f.key)}
            accessibilityRole="radio"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: vm.filter === f.key }}
          >
            <Text style={[
              styles.filterChipText,
              { color: vm.filter === f.key ? (currentColors.textOnAccent || '#fff') : currentColors.textSecondary },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {vm.loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={currentColors.accent} size="large" />
          </View>
        ) : vm.error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={60} color={currentColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>
              {t('notifications.loadError', 'No se pudieron cargar las alertas')}
            </Text>
            <TouchableOpacity onPress={vm.reload} style={{ marginTop: 12 }}>
              <Text style={{ color: currentColors.accent, fontWeight: '700' }}>
                {t('common.retry', 'Reintentar')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : vm.notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={60} color={currentColors.accent} />
            <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>
              {t('notifications.empty')}
            </Text>
          </View>
        ) : (
          vm.notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              currentColors={currentColors}
              onPress={() => {
                if (n.id !== 'summary') vm.acknowledge(n.id)
                if (n.envId) navigation.navigate('EnvironmentDetail', { envId: n.envId })
              }}
            />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

