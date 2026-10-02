import { useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts'
import { useTheme } from '../../../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import { useEnvironment } from '../../../../context/EnvironmentContext.jsx'
import { useDashboardAnalysisVM } from '../../viewmodels/useDashboardAnalysisVM.js'
import { ENVIRONMENT_COLORS, METRICS, normalizeStatus } from '../../utils/historicalSeries.js'
import { styles } from './DashboardScreen.style'

const GRID_COLOR = 'rgba(167,188,208,.28)'
const AXIS_TEXT_COLOR = '#8394A8'
const STATUS_COLORS = { normal: '#25E77C', warning: '#FFB11A', alert: '#FF4D5B' }

function MetricIcon({ name, size = 14, color }) {
  return <Ionicons name={name} size={size} color={color} />
}

function KpiCard({ label, value, note, icon, iconColor, valueColor, noteColor, cardColor, surface }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: surface, borderColor: cardColor }]}>
      <View style={styles.kpiTop}>
        <Text style={[styles.kpiLabel, { color: noteColor }]} numberOfLines={1}>
          {label}
        </Text>
        <MetricIcon name={icon} color={iconColor} />
      </View>
      <Text style={[styles.kpiValue, { color: valueColor }]}>{value}</Text>
      <View style={styles.kpiNote}>
        <Text style={{ color: noteColor, fontSize: 10.5 }} numberOfLines={2}>
          {note}
        </Text>
      </View>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const { darkMode, currentColors } = useTheme()
  const { t } = useTranslation()
  const { loading } = useEnvironment()
  const vm = useDashboardAnalysisVM()

  const screenWidth = Dimensions.get('window').width
  const chartWidth = Math.max(240, screenWidth - 32 - 28 - 44)

  const pointCount = vm.periodLabels[vm.period]?.length || 0
  const initialSpacing = 10
  const endSpacing = 10
  const spacing =
    pointCount > 1
      ? Math.max(16, (chartWidth - initialSpacing - endSpacing) / (pointCount - 1))
      : 40

  const chartColors = vm.series.map((_, index) => ENVIRONMENT_COLORS[index % ENVIRONMENT_COLORS.length])

  const lineProps = useMemo(() => {
    const props = { data: vm.series[0]?.points || [] }
    vm.series.forEach((item, index) => {
      const n = index + 1
      const color = ENVIRONMENT_COLORS[index % ENVIRONMENT_COLORS.length]
      if (n > 1) props[`data${n}`] = item.points
      props[`color${n}`] = color
      props[`startFillColor${n}`] = color
      props[`endFillColor${n}`] = color
      props[`startOpacity${n}`] = 0.3
      props[`endOpacity${n}`] = 0.02
      props[`thickness${n}`] = 2.5
      props[`hideDataPoints${n}`] = true
    })
    if (!vm.series.length) props.data = []
    return props
  }, [vm.series])

  const pointerLabel = (items) => {
    if (!Array.isArray(items) || !items.length) return null
    const rows = items.filter((item) => item && typeof item.value === 'number')
    if (!rows.length) return null
    return (
      <View style={[styles.pointer, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
        <Text style={[styles.pointerLabel, { color: currentColors.textPrimary }]}>{rows[0].label}</Text>
        {rows.map((item, index) => (
          <View key={index} style={styles.pointerRow}>
            <View style={[styles.pointerDot, { backgroundColor: chartColors[index] || currentColors.accent }]} />
            <Text style={[styles.pointerName, { color: currentColors.textMuted }]} numberOfLines={1}>
              {vm.series[index]?.name || ''}
            </Text>
            <Text style={[styles.pointerValue, { color: currentColors.textPrimary }]}>
              {vm.formatMetric(item.value)}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )
}


function RankRow({ env, rank, score, onPress, onToggleFav, currentColors, t }) {
  const status = getEnvironmentStatus(env.statusKey, t)
  const temp = env.temp ?? env.temperature ?? 0
  const pills = [
    { label: `${temp}°`, warn: temp < 18 || temp > 24 },
    { label: `${env.humidity ?? 0}%`, warn: (env.humidity ?? 0) < 40 || (env.humidity ?? 0) > 60 },
    { label: `${env.co2 ?? 0}ppm`, warn: (env.co2 ?? 0) > 1000 },
    { label: `${env.noise ?? 0}dB`, warn: (env.noise ?? 0) > 50 },
  ]
  const warn = pills.filter((p) => p.warn)
  const visible = warn.length ? warn.slice(0, 2) : pills.slice(0, 2)

  return (
    <TouchableOpacity
      style={[rrStyles.row, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}
      onPress={() => onPress(env.id)}
      activeOpacity={0.85}
    >
      <Text style={[rrStyles.rank, { color: currentColors.textMuted }]}>#{rank}</Text>
      <Ionicons
        name={
          env.statusKey === 'dashboard.statusAlert' ? 'alert-circle'
            : env.statusKey === 'dashboard.statusWarning' ? 'warning'
              : 'checkmark-circle'
        }
        size={18}
        color={status.color}
      />
      <View style={{ flex: 1 }}>
        <Text style={[rrStyles.name, { color: currentColors.textPrimary }]} numberOfLines={1}>{env.name}</Text>
        {env.location ? <Text style={[rrStyles.loc, { color: currentColors.textMuted }]}>{env.location}</Text> : null}
      </View>
      <View style={rrStyles.pills}>
        {visible.map((p, i) => (
          <View key={i} style={[rrStyles.pill, { backgroundColor: p.warn ? '#FFC10720' : currentColors.bgCard, borderColor: p.warn ? '#FFC107' : currentColors.borderColor }]}>
            <Text style={[rrStyles.pillTxt, { color: p.warn ? '#FFC107' : currentColors.textMuted }]}>{p.label}</Text>
          </View>
        ))}
      </View>
      <ScoreRing score={score} size={42} />
      <TouchableOpacity onPress={() => onToggleFav(env.id, !env.isFavorite)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: 6 }}>
        <Ionicons
          name={env.isFavorite ? 'heart' : 'heart-outline'}
          size={50}
          color={env.isFavorite ? '#ff6b6b' : currentColors.textMuted}
          accessibilityLabel={env.isFavorite ? t('leaderboard.removeFavorite') : t('leaderboard.addFavorite')}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}


export default function DashboardScreen({ navigation }) {
  const { darkMode, currentColors } = useTheme()
  const { t } = useTranslation()
  const vm = useDashboardVM()

  const PODIUM_ORDER = [2, 1, 3]
  const FILTERS = [
    { key: 'all', label: t('leaderboard.filters.all') },
    { key: 'normal', label: t('leaderboard.filters.normal') },
    { key: 'warning', label: t('leaderboard.filters.warning') },
    { key: 'alert', label: t('leaderboard.filters.alert') },
  ]

  const handlePress = (id) => navigation.navigate('EnvironmentDetail', { envId: id })

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentColors.bgBody }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={currentColors.bgBody} />

      <View style={[styles.header, { backgroundColor: currentColors.bgCard, borderBottomColor: currentColors.borderColor }]}>
        <Ionicons name="analytics" size={24} color={currentColors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: currentColors.textPrimary }]}>{t('dashboardAnalysis.title')}</Text>
          <Text style={[styles.headerSub, { color: currentColors.textMuted }]}>{t('dashboardAnalysis.subtitle')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationsPanel')}
          style={[styles.iconBtn, { backgroundColor: currentColors.bgBody, borderColor: currentColors.borderColor }]}
          hitSlop={6}
        >
          <Ionicons name="notifications-outline" size={20} color={currentColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={currentColors.accent} />
          <Text style={[styles.centerTxt, { color: currentColors.textMuted }]}>
            {t('common.loading', 'Cargando…')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={[styles.eyebrowDot, { backgroundColor: currentColors.accent }]} />
              <Text style={[styles.eyebrowTxt, { color: currentColors.accent }]}>{t('dashboardAnalysis.title')}</Text>
            </View>
            <Text style={[styles.heroTitle, { color: currentColors.textPrimary }]}>
              {t('dashboardAnalysis.heroLine1', 'La calidad ambiental')}
              {'\n'}
              <Text style={styles.heroTitleEm}>{vm.metricLabel}</Text>
            </Text>
            <Text style={[styles.heroDesc, { color: currentColors.textSecondary }]}>{t('dashboardAnalysis.description')}</Text>
          </View>

          <View style={styles.periodRow}>
            {vm.periods.map((item) => {
              const active = vm.period === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.periodChip,
                    { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor },
                    active && { backgroundColor: currentColors.accent, borderColor: currentColors.accent },
                  ]}
                  onPress={() => vm.setPeriod(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.periodChipTxt, { color: active ? '#fff' : currentColors.textSecondary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <View style={styles.periodContext}>
            <Ionicons name="calendar-outline" size={14} color={currentColors.textMuted} />
            <Text style={[styles.periodContextTxt, { color: currentColors.textMuted }]}>{vm.periodInfo.context}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            {Object.keys(METRICS).map((key) => {
              const active = vm.metric === key
              const info = METRICS[key]
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.chip,
                    { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor },
                    active && { backgroundColor: `${info.color}18`, borderColor: info.color },
                  ]}
                  onPress={() => vm.setMetric(key)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={info.icon} size={14} color={active ? info.color : currentColors.textMuted} />
                  <Text style={[styles.chipTxt, { color: active ? info.color : currentColors.textSecondary }]}>
                    {vm.metricLabels[key]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={[styles.card, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: currentColors.textMuted }]}>
                  {t('dashboardAnalysis.contextLabel', 'CONTEXTO')}
                </Text>
                <Text style={[styles.cardTitle, { color: currentColors.textPrimary }]}>
                  {t('dashboardAnalysis.context.environments')}
                </Text>
                <Text style={[styles.cardSub, { color: currentColors.textMuted }]}>
                  {t('dashboardAnalysis.context.selectEnvironment')}
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: `${currentColors.accent}18` }]}>
                <Text style={[styles.countBadgeTxt, { color: currentColors.accent }]}>{vm.environments.length}</Text>
              </View>
            </View>

            <View style={styles.envList}>
              <TouchableOpacity
                style={[
                  styles.envRow,
                  {
                    backgroundColor: vm.environmentId === 'all' ? `${currentColors.accent}12` : currentColors.bgCard,
                    borderColor: vm.environmentId === 'all' ? currentColors.accent : currentColors.borderColor,
                  },
                ]}
                onPress={() => vm.setEnvironmentId('all')}
                activeOpacity={0.8}
              >
                <View style={[styles.envIcon, { backgroundColor: `${currentColors.accent}18` }]}>
                  <Ionicons name="leaf-outline" size={16} color={currentColors.accent} />
                </View>
                <View style={styles.envInfo}>
                  <Text style={[styles.envName, { color: currentColors.textPrimary }]}>
                    {t('dashboardAnalysis.context.allEnvironments')}
                  </Text>
                  <Text style={[styles.envMeta, { color: currentColors.textMuted }]}>
                    {t('dashboardAnalysis.context.consolidatedView')}
                  </Text>
                </View>
              </TouchableOpacity>
              {vm.environments.map(environmentRow)}
            </View>

            <View style={[styles.updatedRow, { borderTopColor: currentColors.borderColor }]}>
              <Ionicons name="time-outline" size={14} color={currentColors.textMuted} />
              <Text style={[styles.updatedTxt, { color: currentColors.textMuted }]}>
                {t('dashboardAnalysis.context.lastReading')}
                {' · '}
                <Text style={{ fontWeight: '800', color: currentColors.textSecondary }}>{vm.lastUpdatedLabel}</Text>
              </Text>
              <TouchableOpacity
                style={[styles.refreshBtn, { borderColor: currentColors.borderColor }]}
                onPress={vm.refresh}
                hitSlop={8}
                accessibilityLabel={t('dashboardAnalysis.ariaLabels.refreshData')}
              >
                <Ionicons name="refresh" size={14} color={currentColors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard
              label={`${t('dashboardAnalysis.kpi.averagePrefix')}${vm.metricLabel}`}
              value={vm.formatMetric(vm.average)}
              note={`↓ ${t('dashboardAnalysis.kpi.vsPreviousPeriod')}`}
              icon={vm.metricInfo.icon}
              iconColor={currentColors.accent}
              valueColor={currentColors.accent}
              noteColor={currentColors.textMuted}
              cardColor={`${currentColors.accent}55`}
              surface={`${currentColors.accent}10`}
            />
            <KpiCard
              label={vm.statusLabels.normal}
              value={String(vm.statusCounts.normal)}
              note={t('dashboardAnalysis.kpi.environmentsInRange')}
              icon="checkmark-circle-outline"
              iconColor={STATUS_COLORS.normal}
              valueColor={STATUS_COLORS.normal}
              noteColor={currentColors.textMuted}
              cardColor={currentColors.borderColor}
              surface={currentColors.bgCard}
            />
            <KpiCard
              label={vm.statusLabels.warning}
              value={String(vm.statusCounts.warning)}
              note={t('dashboardAnalysis.kpi.requireFollowUp')}
              icon="stats-chart-outline"
              iconColor={STATUS_COLORS.warning}
              valueColor={STATUS_COLORS.warning}
              noteColor={currentColors.textMuted}
              cardColor={currentColors.borderColor}
              surface={currentColors.bgCard}
            />
            <KpiCard
              label={vm.statusLabels.alert}
              value={String(vm.statusCounts.alert)}
              note={t('dashboardAnalysis.kpi.requireAttention')}
              icon="speedometer-outline"
              iconColor={STATUS_COLORS.alert}
              valueColor={STATUS_COLORS.alert}
              noteColor={currentColors.textMuted}
              cardColor={currentColors.borderColor}
              surface={currentColors.bgCard}
            />
          </View>

          <View style={[styles.card, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: currentColors.textMuted }]}>{t('dashboardAnalysis.title')}</Text>
                <Text style={[styles.cardTitle, { color: currentColors.textPrimary }]}>
                  {vm.metricLabel} {t('dashboardAnalysis.chart.throughTime')}
                </Text>
                <Text style={[styles.cardSub, { color: currentColors.textMuted }]}>
                  {vm.selectedLabel} · {vm.periodInfo.context}
                </Text>
              </View>
              <View style={[styles.livePill, { backgroundColor: `${currentColors.accent}14` }]}>
                <View style={[styles.liveDot, { backgroundColor: currentColors.accent }]} />
                <Text style={[styles.liveTxt, { color: currentColors.accent }]}>{t('dashboardAnalysis.chart.syncedData')}</Text>
              </View>
            </View>

            <View style={styles.legendRow}>
              {vm.series.map((item, index) => (
                <View key={item.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: ENVIRONMENT_COLORS[index % ENVIRONMENT_COLORS.length] }]} />
                  <Text style={[styles.legendTxt, { color: currentColors.textSecondary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              ))}
              <View style={styles.legendComfort}>
                <View style={[styles.legendDash, { borderColor: currentColors.textMuted }]} />
                <Text style={[styles.legendTxt, { color: currentColors.textMuted }]}>
                  {t('dashboardAnalysis.chart.comfortThreshold')}
                </Text>
              </View>
            </View>

            <LineChart
              {...lineProps}
              areaChart
              width={chartWidth}
              height={210}
              spacing={spacing}
              initialSpacing={initialSpacing}
              endSpacing={endSpacing}
              maxValue={Math.max(1, vm.chartRange.max - vm.chartRange.min)}
              yAxisOffset={vm.chartRange.min}
              noOfSections={4}
              thickness={2.5}
              isAnimated={false}
              rulesColor={GRID_COLOR}
              dashWidth={3}
              dashGap={5}
              rulesType="dashed"
              xAxisColor="transparent"
              yAxisColor="transparent"
              yAxisThickness={0}
              yAxisLabelWidth={44}
              xAxisLabelTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 10 }}
              yAxisTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 10 }}
              showReferenceLine1
              referenceLine1Position={vm.chartRange.comfort}
              referenceLine1Config={{
                color: 'rgba(185,203,197,.85)',
                type: 'dashed',
                dashWidth: 5,
                dashGap: 5,
                thickness: 1.2,
                labelText: '',
              }}
              disableScroll
              pointerConfig={{
                activatePointersOnLongPress: true,
                persistPointer: true,
                pointerColor: currentColors.accent,
                pointerWidth: 10,
                pointerHeight: 10,
                pointerRadius: 5,
                pointerLabelComponent: pointerLabel,
              }}
            />

            <View style={styles.captionRow}>
              <Text style={[styles.captionTxt, { color: currentColors.textMuted }]}>
                {t('dashboardAnalysis.chart.recommendedAverage')}
                {vm.formatMetric(vm.chartRange.comfort)}
              </Text>
              <Text style={[styles.captionTxt, { color: currentColors.textMuted, textAlign: 'right' }]}>
                {vm.metric === 'co2'
                  ? t('dashboardAnalysis.chart.co2Range')
                  : t('dashboardAnalysis.chart.referenceRange')}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: currentColors.textMuted }]}>
                  {t('dashboardAnalysis.comparison.title')}
                </Text>
                <Text style={[styles.cardTitle, { color: currentColors.textPrimary }]}>
                  {t('dashboardAnalysis.comparison.byEnvironment')}
                </Text>
                <Text style={[styles.cardSub, { color: currentColors.textMuted }]}>
                  {t('dashboardAnalysis.comparison.descriptionPrefix')} {vm.metricLabel.toLowerCase()}{' '}
                  {t('dashboardAnalysis.comparison.descriptionSuffix')}
                </Text>
              </View>
              <Ionicons name="bar-chart-outline" size={18} color={currentColors.textMuted} />
            </View>

            {barData.length ? (
              <BarChart
                data={barData}
                width={chartWidth}
                height={190}
                barWidth={barWidth}
                roundedTop
                barBorderRadius={5}
                noOfSections={4}
                maxValue={Math.max(...barData.map((item) => item.value)) * 1.15}
                spacing={Math.max(8, (chartWidth - 46) / Math.max(barData.length, 1) - barWidth)}
                initialSpacing={8}
                endSpacing={8}
                isAnimated={false}
                rulesColor={GRID_COLOR}
                dashWidth={3}
                dashGap={5}
                rulesType="dashed"
                xAxisColor="transparent"
                yAxisColor="transparent"
                yAxisThickness={0}
                yAxisLabelWidth={44}
                xAxisLabelTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 9 }}
                yAxisTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 10 }}
                disableScroll
              />
            ) : (
              <Text style={[styles.cardSub, { color: currentColors.textMuted }]}>
                {t('dashboardAnalysis.comparison.descriptionSuffix', 'Sin datos')}
              </Text>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: currentColors.textMuted }]}>{t('dashboardAnalysis.network.title')}</Text>
                <Text style={[styles.cardTitle, { color: currentColors.textPrimary }]}>{t('dashboardAnalysis.network.health')}</Text>
              </View>
              <View style={[styles.livePill, { backgroundColor: `${currentColors.accent}14` }]}>
                <View style={[styles.liveDot, { backgroundColor: currentColors.accent }]} />
                <Text style={[styles.liveTxt, { color: currentColors.accent }]}>{t('dashboardAnalysis.network.monitoring')}</Text>
              </View>
            </View>

            <View style={styles.networkBody}>
              <View style={styles.donutWrap}>
                <PieChart
                  donut
                  data={donutData}
                  radius={62}
                  innerRadius={42}
                  strokeWidth={0}
                  backgroundColor="transparent"
                  isAnimated={false}
                  centerLabelComponent={() => (
                    <View style={styles.donutCenter}>
                      <Text style={[styles.donutValue, { color: currentColors.textPrimary }]}>{vm.healthPercent}%</Text>
                      <Text style={[styles.donutLabel, { color: currentColors.textMuted }]}>
                        {t('dashboardAnalysis.network.inRange')}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={styles.networkLegend}>
                {[
                  { key: 'normal', label: vm.statusLabels.normal, value: vm.statusCounts.normal },
                  { key: 'warning', label: vm.statusLabels.warning, value: vm.statusCounts.warning },
                  { key: 'alert', label: vm.statusLabels.alert, value: vm.statusCounts.alert },
                ].map((item) => (
                  <View key={item.key} style={styles.networkRow}>
                    <View style={[styles.networkDot, { backgroundColor: STATUS_COLORS[item.key] }]} />
                    <Text style={[styles.networkName, { color: currentColors.textSecondary }]}>{item.label}</Text>
                    <Text style={[styles.networkCount, { color: currentColors.textPrimary }]}>{item.value}</Text>
                  </View>
                ))}
                <View style={styles.networkFoot}>
                  <Ionicons name="checkmark-circle" size={13} color={currentColors.accent} />
                  <Text style={[styles.footerTxt, { color: currentColors.textMuted }]}>
                    {t('dashboardAnalysis.network.dataUpdated')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: currentColors.bgCard, borderColor: currentColors.borderColor }]}>
            <Text style={[styles.sectionLabel, { color: currentColors.textMuted }]}>
              {t('dashboardAnalysis.quickReading.title')}
            </Text>
            <Text style={[styles.readingTitle, { color: currentColors.textPrimary }]}>
              {vm.statusCounts.alert > 0
                ? t('dashboardAnalysis.quickReading.alertMessage')
                : t('dashboardAnalysis.quickReading.normalMessage')}
            </Text>
            <Text style={[styles.readingDesc, { color: currentColors.textSecondary }]}>
              {vm.statusCounts.alert > 0
                ? t('dashboardAnalysis.quickReading.alertDescription')
                : t('dashboardAnalysis.quickReading.normalDescription')}
            </Text>
            <TouchableOpacity
              style={styles.readingBtn}
              onPress={() =>
                vm.setEnvironmentId(
                  vm.statusCounts.alert > 0
                    ? String(
                        vm.environments.find((env) => normalizeStatus(env.statusKey).key === 'alert')?.id || 'all'
                      )
                    : 'all'
                )
              }
            >
              <Text style={[styles.readingBtnTxt, { color: currentColors.accent }]}>
                {t('dashboardAnalysis.quickReading.viewDetail')}
              </Text>
              <Ionicons name="arrow-up" size={14} color={currentColors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerTxt, { color: currentColors.textMuted }]}>{t('dashboardAnalysis.footer.brand')}</Text>
            <Text style={[styles.footerTxt, { color: currentColors.textMuted }]}>
              {vm.environments.length} {t('dashboardAnalysis.footer.autoUpdate')}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
