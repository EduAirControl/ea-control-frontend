import { useTranslation } from 'react-i18next';
import './ScoreCircle.css';

/**
 * @param {number|null} score 0-100, o null cuando el ambiente no tiene
 *   mediciones. `calculateEnvironmentScore` devuelve 100 cuando no hay datos
 *   (ninguna comparación se dispara), así que el que llama decide: sin métricas
 *   se pasa null y aquí se dibuja el anillo vacío en vez de un "Excelente"
 *   inventado.
 */
function ScoreCircle({ score = null, size = 110 }) {
  const { t } = useTranslation();
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const hasScore = typeof score === 'number' && !Number.isNaN(score);
  const progress = hasScore ? circumference - (score / 100) * circumference : circumference;

  const getColor = () => {
    if (!hasScore) return '#94a3b8';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = () => {
    if (!hasScore) return t('common.noData');
    if (score >= 80) return t('score.excellent', 'Excelente');
    if (score >= 60) return t('score.acceptable', 'Aceptable');
    return t('score.critical', 'Crítico');
  };

  return (
    <div className="score-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle className="score-bg" cx="60" cy="60" r={radius} />

        <circle
          className="score-progress"
          cx="60"
          cy="60"
          r={radius}
          stroke={getColor()}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>

      <div className="score-content">
        <h2>{hasScore ? score : '—'}</h2>
        <span>{getLabel()}</span>
      </div>
    </div>
  );
}

export default ScoreCircle;
