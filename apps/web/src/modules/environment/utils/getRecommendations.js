const RECOMMENDATION_BY_METRIC = {
  temp: 'allEnvironments.recTemp',
  humidity: 'allEnvironments.recHumidity',
  co2: 'allEnvironments.recCo2',
  noise: 'allEnvironments.recNoise',
};

/**
 * Recomendaciones derivadas de la severidad calculada por el backend con los
 * umbrales del ambiente. No se comparan valores contra cortes fijos.
 */
export function getRecommendations(environment, t) {
  const severity = environment.metricSeverity || {};
  const recommendations = [];

  Object.entries(RECOMMENDATION_BY_METRIC).forEach(([metric, key]) => {
    if (severity[metric] === 'WARNING' || severity[metric] === 'CRITICAL') {
      recommendations.push(t(key));
    }
  });

  const evaluated = Object.values(severity).filter(
    (value) => value === 'OK' || value === 'WARNING' || value === 'CRITICAL'
  );

  if (recommendations.length === 0 && evaluated.length > 0) {
    recommendations.push(t('allEnvironments.recPerfect'));
  }

  return recommendations;
}
