import { FaTimes, FaHeart, FaRegHeart, FaTemperatureHigh } from 'react-icons/fa';
import { WiHumidity } from 'react-icons/wi';
import { MdCo2 } from 'react-icons/md';
import { HiSpeakerWave } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

import ScoreCircle from '../ScoreCircle/ScoreCircle';
import SensorInfo from '../SensorInfo/SensorInfo';
import RecommendationBox from '../RecommendationBox/RecommendationBox';
import EnvironmentExplanation from '../EnvironmentExplanation/EnvironmentExplanation';
import InfoTooltip from '../InfoTooltip/InfoTooltip';

import { getRecommendations } from '../../utils/getRecommendations';

import './EnvironmentModal.css';

function formatValue(value, unit) {
  return value === undefined || value === null || Number.isNaN(value) ? '—' : `${value} ${unit}`;
}

function EnvironmentModal({ isOpen, onClose, environment, isFavorite, onToggleFavorite }) {
  const { t } = useTranslation();

  if (!isOpen || !environment) return null;

  const statusText = environment.statusKey ? t(environment.statusKey) : environment.status;

  const statusClass =
    environment.statusKey === 'dashboard.statusNormal'
      ? 'normal'
      : environment.statusKey === 'dashboard.statusWarning'
        ? 'warning'
        : 'danger';

  return (
    <div className="environment-modal-overlay" onClick={onClose}>
      <div className="environment-modal" onClick={(e) => e.stopPropagation()}>
        <button className="env-modal__close" onClick={onClose} aria-label="Cerrar">
          <FaTimes />
        </button>

        <header className="modal-header">
          <h2>{environment.nameKey ? t(environment.nameKey) : environment.name}</h2>

          <span className={`modal-status ${statusClass}`}>{statusText}</span>
        </header>

        <div className="environment-score" style={{ position: 'relative', paddingRight: 44 }}>
          <InfoTooltip text={t('tooltips.score')} />

          <ScoreCircle score={environment.score} size={130} />

          <div className="environment-score-info">
            <h3>{t('allEnvironments.qualityTitle')}</h3>

            <p>{t('allEnvironments.qualityDesc')}</p>
          </div>
        </div>

        <div className="modal-sensors">
          <div style={{ position: 'relative' }}>
            <InfoTooltip text={t('tooltips.temperature')} />
            <SensorInfo
              icon={<FaTemperatureHigh />}
              title={t('dashboard.temperature')}
              value={formatValue(environment.temp, '°C')}
              description={t('allEnvironments.tempDescription')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <InfoTooltip text={t('tooltips.humidity')} />
            <SensorInfo
              icon={<WiHumidity />}
              title={t('dashboard.humidity')}
              value={formatValue(environment.humidity, '%')}
              description={t('allEnvironments.humidityDescription')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <InfoTooltip text={t('tooltips.co2')} />
            <SensorInfo
              icon={<MdCo2 />}
              title={t('allEnvironments.co2')}
              value={formatValue(environment.co2, 'ppm')}
              description={t('allEnvironments.co2Description')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <InfoTooltip text={t('tooltips.noise')} />
            <SensorInfo
              icon={<HiSpeakerWave />}
              title={t('dashboard.noise')}
              value={formatValue(environment.noise, 'dB')}
              description={t('allEnvironments.noiseDescription')}
            />
          </div>
        </div>

        <div style={{ position: 'relative', paddingRight: 44 }}>
          <InfoTooltip text={t('tooltips.recommendations')} />
          <RecommendationBox recommendations={getRecommendations(environment, t)} />
        </div>

        <EnvironmentExplanation />

        <div className="modal-actions">
          <button
            className={`modal-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
          >
            {isFavorite ? <FaHeart /> : <FaRegHeart />}
            {isFavorite ? t('allEnvironments.removeFavorite') : t('allEnvironments.favorite')}
          </button>

          <button className="close-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnvironmentModal;
