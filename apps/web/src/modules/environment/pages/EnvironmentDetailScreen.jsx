import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { WiThermometer, WiHumidity } from 'react-icons/wi';
import { MdCo2 } from 'react-icons/md';
import { HiSpeakerWave } from 'react-icons/hi2';
import { FaHeart, FaRegHeart, FaUser, FaMapMarkerAlt } from 'react-icons/fa';
import { IoPeopleOutline } from 'react-icons/io5';
import { IoCheckmarkCircle, IoWarning, IoAlertCircle, IoHardwareChipOutline, IoUnlinkOutline } from 'react-icons/io5';
import Navbar from '../../dashboard/components/Navbar/Navbar';
import { BackButton } from '../../../shared/components';
import { useEnvironment } from '../../../context/useEnvironment';
import { useToast } from '../../../shared/hooks/useToast';
import sensorService from '../services/sensorService';
import environmentService from '../services/environmentService';
import { getMetricColor } from '../utils/environmentHelpers';
import { STATUS_COLORS, QUALITY_COLORS } from '../constants/environments';
import './EnvironmentDetail.css';

/**
 * Un ambiente sin mediciones tiene las métricas en `undefined`. Sin esta guarda
 * la pantalla pintaba literalmente "undefined°C".
 */
const formatMetric = (value, unit) =>
  value === undefined || value === null || Number.isNaN(value) ? '—' : `${value}${unit}`;

const METRIC_TO_VARIABLE = {
  temp: 'temperature',
  humidity: 'humidity',
  co2: 'co2',
  noise: 'noise',
};

const UNIT_BY_METRIC = {
  temp: '°C',
  humidity: '%',
  co2: ' ppm',
  noise: ' dB',
};

function MetricBar({ value, min, max, color }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="metric-bar-track">
      <div className="metric-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatusIcon({ statusKey }) {
  if (statusKey === 'dashboard.statusNormal')
    return <IoCheckmarkCircle className="detail-status-icon normal" />;
  if (statusKey === 'dashboard.statusWarning')
    return <IoWarning className="detail-status-icon warning" />;
  return <IoAlertCircle className="detail-status-icon alert" />;
}

function EnvironmentDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { environments, toggleFavorite } = useEnvironment();
  const toast = useToast();

  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [thresholds, setThresholds] = useState([]);

  const loadDevices = useCallback(async () => {
    if (!id) {
      setDevices([]);
      setDevicesLoading(false);
      return;
    }
    try {
      const installations = await sensorService.listInstallationsByEnvironment(id, { active: true });
      if (!installations.length) {
        setDevices([]);
        return;
      }
      const rows = await Promise.all(
        installations.map(async (installation) => {
          let sensor = null;
          try {
            sensor = await sensorService.getSensor(installation.sensorId);
          } catch {
            sensor = null;
          }
          return { installation, sensor };
        })
      );
      setDevices(rows);
    } catch {
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Rangos normales configurados para ESTE ambiente. La UI no usa cortes fijos:
  // si el admin cambia los umbrales, aquí se reflejan.
  useEffect(() => {
    let cancelled = false;
    if (!id) return undefined;
    environmentService
      .getThresholds(id)
      .then((rows) => { if (!cancelled) setThresholds(rows || []); })
      .catch(() => { if (!cancelled) setThresholds([]); });
    return () => { cancelled = true; };
  }, [id]);

  const handleUnlink = async (installation) => {
    const ok = window.confirm(
      t('sensors.confirmUnlink', '¿Desvincular este dispositivo del ambiente?')
    );
    if (!ok) return;
    try {
      await sensorService.removeInstallation(installation.sensorInstallationId ?? installation.id);
      toast.success(t('sensors.uninstallDone', 'Dispositivo desvinculado del ambiente'));
      await loadDevices();
    } catch (error) {
      toast.error(error.message || t('sensors.unlinkError', 'No fue posible desvincular el dispositivo'));
    }
  };

  const env = environments.find((e) => String(e.id) === String(id));

  if (!env) {
    return (
      <div className="detail-page">
        <Navbar />
        <main id="main-content" className="detail-container">
          <BackButton onClick={() => navigate('/all-environments')} />
          <div className="detail-not-found">
            <p>{t('detail.notFound') || 'Ambiente no encontrado'}</p>
          </div>
        </main>
      </div>
    );
  }

  const name = env.nameKey ? t(env.nameKey) : env.name;
  const statusColor = STATUS_COLORS[env.statusKey];
  const qualityKey =
    env.qualityKey ||
    (env.statusKey === 'dashboard.statusAlert'
      ? 'dashboard.qualityBad'
      : env.statusKey === 'dashboard.statusWarning'
        ? 'dashboard.qualityRegular'
        : 'dashboard.qualityGood');
  const qualityColor = QUALITY_COLORS[qualityKey];

  const normalByVariable = Object.fromEntries(
    thresholds
      .filter((threshold) => threshold.severityCode === 'INFO')
      .map((threshold) => [threshold.variableCode, threshold])
  );

  const idealOf = (metricKey) => {
    const threshold = normalByVariable[METRIC_TO_VARIABLE[metricKey]];
    if (!threshold || threshold.minValue == null || threshold.maxValue == null) return '—';
    return `${threshold.minValue}–${threshold.maxValue}${UNIT_BY_METRIC[metricKey]}`;
  };

  const metrics = [
    {
      icon: <WiThermometer className="detail-metric-icon temp" />,
      label: t('dashboard.temperature'),
      value: formatMetric(env.temp, '°C'),
      rawValue: env.temp,
      ideal: idealOf('temp'),
      min: 0,
      max: 50,
      key: 'temp',
    },
    {
      icon: <WiHumidity className="detail-metric-icon humidity" />,
      label: t('dashboard.humidity'),
      value: formatMetric(env.humidity, '%'),
      rawValue: env.humidity,
      ideal: idealOf('humidity'),
      min: 0,
      max: 100,
      key: 'humidity',
    },
    {
      icon: <MdCo2 className="detail-metric-icon co2" />,
      label: 'CO₂',
      value: formatMetric(env.co2, ' ppm'),
      rawValue: env.co2,
      ideal: idealOf('co2'),
      min: 0,
      max: 2000,
      key: 'co2',
    },
    {
      icon: <HiSpeakerWave className="detail-metric-icon noise" />,
      label: t('dashboard.noise'),
      value: formatMetric(env.noise, ' dB'),
      rawValue: env.noise,
      ideal: idealOf('noise'),
      min: 0,
      max: 120,
      key: 'noise',
    },
  ];

  return (
      <div className="detail-page">
      <Navbar />
      <main id="main-content" className="detail-container">
        <BackButton onClick={() => navigate('/all-environments')} />

        {/* Hero */}
        <div className="detail-hero">
          <div className="detail-hero-left">
            <h1 className="detail-name">{name}</h1>

            <div className="detail-meta">
              {env.location && (
                <span className="detail-meta-item">
                  <FaMapMarkerAlt /> {env.location}
                </span>
              )}

              {env.capacity && (
                <span className="detail-meta-item">
                  <FaUser /> {t('management.capacity')}: {env.capacity}
                </span>
              )}
            </div>
          </div>

          <div className="detail-hero-right">
            <div
              className="detail-status-badge"
              style={{ borderColor: statusColor, color: statusColor }}
            >
              <StatusIcon statusKey={env.statusKey} />
              <span>{t(env.statusKey)}</span>
            </div>

            <button
              className={`detail-fav-btn ${env.isFavorite ? 'active' : ''}`}
              onClick={() => toggleFavorite(env.id, !env.isFavorite)}
            >
              {env.isFavorite ? <FaHeart /> : <FaRegHeart />}
              <span>
                {env.isFavorite
                  ? t('detail.removeFav') || 'Quitar favorito'
                  : t('detail.addFav') || 'Agregar favorito'}
              </span>
            </button>
          </div>
        </div>

        {/* Air Quality */}
        <div className="detail-quality-banner" style={{ borderLeftColor: qualityColor }}>
          <div>
            <p className="detail-quality-label">{t('dashboard.airQuality')}</p>
            <p className="detail-quality-value" style={{ color: qualityColor }}>
              {t(qualityKey)}
            </p>
          </div>

          <div className="detail-quality-desc">
            <p>
              {t('detail.qualityDesc') ||
                'Basado en los niveles de CO₂, temperatura, humedad y ruido del ambiente.'}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <h2 className="detail-section-title">
          {t('detail.metricsTitle') || 'Métricas en tiempo real'}
        </h2>

        <div className="detail-metrics-grid">
          {metrics.map((m) => (
            <div className="detail-metric-card" key={m.key}>
              <div className="detail-metric-header">
                {m.icon}

                <div>
                  <p className="detail-metric-label">{m.label}</p>
                  <p className="detail-metric-value">{m.value}</p>
                </div>
              </div>

              <MetricBar
                value={m.rawValue}
                min={m.min}
                max={m.max}
                color={getMetricColor(m.key, m.rawValue, env.metricSeverity?.[m.key])}
              />

              <div className="detail-metric-footer">
                <span>{t('dashboard.idealRange')}</span>
                <span className="detail-metric-ideal">{m.ideal}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Cards Row */}
        <div className="detail-info-row">
          <div className="detail-info-card">
            <h3>
              <FaMapMarkerAlt aria-hidden="true" /> {t('detail.locationTitle') || 'Ubicación'}
            </h3>
            <p>{env.location || '—'}</p>
          </div>

          <div className="detail-info-card">
            <h3>
              <IoPeopleOutline aria-hidden="true" /> {t('detail.capacityTitle') || 'Capacidad'}
            </h3>
            <p>{env.capacity ? `${env.capacity} ${t('detail.people') || 'personas'}` : '—'}</p>
          </div>

          <div className="detail-info-card">
            <h3>
              <WiThermometer aria-hidden="true" /> {t('detail.conditionsTitle') || 'Condiciones'}
            </h3>
            <p style={{ color: statusColor, fontWeight: 600 }}>{t(env.statusKey)}</p>
          </div>
        </div>

        {/* Dispositivos */}
        <h2 className="detail-section-title">
          <IoHardwareChipOutline /> {t('sensors.title') || 'Dispositivos'}
        </h2>

        {devicesLoading ? (
          <div className="detail-info-card">
            <p>{t('common.loading') || 'Cargando…'}</p>
          </div>
        ) : !devices.length ? (
          <div className="detail-info-card">
            <p>{t('sensors.empty') || 'No hay dispositivos vinculados a este ambiente.'}</p>
          </div>
        ) : (
          <div className="detail-info-row">
            {devices.map(({ installation, sensor }) => (
              <div className="detail-info-card" key={installation.sensorInstallationId ?? installation.id}>
                <h3>
                  <IoHardwareChipOutline /> {sensor?.serialNumber || installation.sensorId}
                </h3>
                <button
                  className="detail-unlink-btn"
                  onClick={() => handleUnlink(installation)}
                >
                  <IoUnlinkOutline /> {t('sensors.uninstall') || 'Desvincular'}
                </button>
              </div>
            ))}
          </div>
        )}

        <br />
      </main>
    </div>
  );
}

export default EnvironmentDetailScreen;
