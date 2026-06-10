// ============================================================
// ChampIndex — Algorithme de scoring météo
// ============================================================

import type { WeatherData, WeatherScore, WeatherScoreDetail, ScoreLevel, ScoreLevelInfo } from '../types';

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * Score météo principal (0-100)
 * Basé sur 5 facteurs pondérés
 */
export function computeWeatherScore(weatherData: WeatherData): WeatherScore {
  const daily = weatherData.daily;
  const details: WeatherScoreDetail[] = [];

  // ---- 1. CUMUL PLUIE 14 JOURS (max 30 pts) ----
  const rain14Days = daily.precipitation_sum.slice(-14);
  const rain14 = sum(rain14Days);
  let rain14Score: number;
  let rain14Impact: WeatherScoreDetail['impact'];

  if (rain14 >= 40 && rain14 <= 80) {
    rain14Score = 30; rain14Impact = '++';
  } else if (rain14 >= 25 && rain14 < 40) {
    rain14Score = 22; rain14Impact = '+';
  } else if (rain14 > 80 && rain14 <= 120) {
    rain14Score = 18; rain14Impact = '+';
  } else if (rain14 >= 10 && rain14 < 25) {
    rain14Score = 10; rain14Impact = '-';
  } else if (rain14 < 10) {
    rain14Score = 2; rain14Impact = '--';
  } else {
    rain14Score = 8; rain14Impact = '-';
  }

  details.push({
    factor: 'rain14',
    label: 'Pluie 14 jours',
    value: `${rain14.toFixed(0)} mm`,
    score: rain14Score,
    maxScore: 30,
    impact: rain14Impact,
  });

  // ---- 2. PLUIE RÉCENTE 3 JOURS (max 20 pts) ----
  const rain3Days = daily.precipitation_sum.slice(-3);
  const rain3 = sum(rain3Days);
  let rain3Score: number;
  let rain3Impact: WeatherScoreDetail['impact'];

  if (rain3 >= 10 && rain3 <= 30) {
    rain3Score = 20; rain3Impact = '++';
  } else if (rain3 >= 5 && rain3 < 10) {
    rain3Score = 14; rain3Impact = '+';
  } else if (rain3 > 30) {
    rain3Score = 10; rain3Impact = '~';
  } else {
    rain3Score = 3; rain3Impact = '--';
  }

  details.push({
    factor: 'rain3',
    label: 'Pluie 3 jours',
    value: `${rain3.toFixed(0)} mm`,
    score: rain3Score,
    maxScore: 20,
    impact: rain3Impact,
  });

  // ---- 3. TEMPÉRATURE MOYENNE 7 JOURS (max 25 pts) ----
  const temps7 = daily.temperature_2m_mean.slice(-7);
  const avgTemp7 = mean(temps7);
  const month = new Date().getMonth() + 1;
  const idealRange: [number, number] = (month >= 9 || month <= 2) ? [8, 18] : [14, 22];
  let tempScore: number;
  let tempImpact: WeatherScoreDetail['impact'];

  if (avgTemp7 >= idealRange[0] && avgTemp7 <= idealRange[1]) {
    tempScore = 25; tempImpact = '++';
  } else if (avgTemp7 >= idealRange[0] - 4 && avgTemp7 <= idealRange[1] + 4) {
    tempScore = 16; tempImpact = '+';
  } else if (avgTemp7 < 3) {
    tempScore = 3; tempImpact = '--';
  } else {
    tempScore = 8; tempImpact = '-';
  }

  details.push({
    factor: 'temperature',
    label: 'Température 7j',
    value: `${avgTemp7.toFixed(1)}°C`,
    score: tempScore,
    maxScore: 25,
    impact: tempImpact,
  });

  // ---- 4. AMPLITUDE THERMIQUE (max 15 pts) ----
  const maxTemps = daily.temperature_2m_max.slice(-7);
  const minTemps = daily.temperature_2m_min.slice(-7);
  const amplitudes = maxTemps.map((max, i) => max - minTemps[i]);
  const tempAmplitude = mean(amplitudes);
  let amplitudeScore: number;
  let amplitudeImpact: WeatherScoreDetail['impact'];

  if (tempAmplitude >= 8 && tempAmplitude <= 15) {
    amplitudeScore = 15; amplitudeImpact = '++';
  } else if (tempAmplitude >= 5 && tempAmplitude < 8) {
    amplitudeScore = 10; amplitudeImpact = '+';
  } else {
    amplitudeScore = 5; amplitudeImpact = '-';
  }

  details.push({
    factor: 'amplitude',
    label: 'Amplitude jour/nuit',
    value: `${tempAmplitude.toFixed(1)}°C`,
    score: amplitudeScore,
    maxScore: 15,
    impact: amplitudeImpact,
  });

  // ---- 5. SAISONNALITÉ (max 10 pts) ----
  const peakMonths = [9, 10, 11];
  const goodMonths = [4, 5, 6, 7, 8];
  let seasonScore: number;
  let seasonImpact: WeatherScoreDetail['impact'];

  if (peakMonths.includes(month)) {
    seasonScore = 10; seasonImpact = '++';
  } else if (goodMonths.includes(month)) {
    seasonScore = 6; seasonImpact = '+';
  } else {
    seasonScore = 2; seasonImpact = '-';
  }

  const seasonLabels: Record<number, string> = {
    1: 'Hiver', 2: 'Hiver', 3: 'Début printemps',
    4: 'Printemps', 5: 'Printemps', 6: 'Été',
    7: 'Été', 8: 'Fin été', 9: 'Automne',
    10: 'Automne', 11: 'Automne', 12: 'Hiver',
  };

  details.push({
    factor: 'season',
    label: 'Saison',
    value: seasonLabels[month],
    score: seasonScore,
    maxScore: 10,
    impact: seasonImpact,
  });

  const total = Math.min(100, rain14Score + rain3Score + tempScore + amplitudeScore + seasonScore);

  return { total, details };
}

/**
 * Interprétation du score
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'exceptionnel';
  if (score >= 65) return 'tres-favorable';
  if (score >= 50) return 'favorable';
  if (score >= 35) return 'moyen';
  if (score >= 20) return 'peu-favorable';
  return 'defavorable';
}

export const SCORE_LEVELS: Record<ScoreLevel, ScoreLevelInfo> = {
  'exceptionnel': {
    label: 'Exceptionnel',
    color: '#2d6a4f',
    emoji: '🍄🍄🍄',
    advice: 'Conditions exceptionnelles ! Les champignons devraient être au rendez-vous. Privilégiez les sous-bois de feuillus et les lisières après une pluie récente.',
  },
  'tres-favorable': {
    label: 'Très favorable',
    color: '#40916c',
    emoji: '🍄🍄',
    advice: 'Très favorable. Ciblez les pentes douces orientées nord, les fonds de vallées et les pieds de chênes et hêtres.',
  },
  'favorable': {
    label: 'Favorable',
    color: '#6a994e',
    emoji: '🍄',
    advice: 'Conditions correctes. Cherchez les zones ombragées et humides : bords de ruisseaux, mousse épaisse, sous-bois denses.',
  },
  'moyen': {
    label: 'Moyen',
    color: '#bc6c25',
    emoji: '🤔',
    advice: 'Conditions moyennes. Seuls les coins les plus humides (fonds de vallée, mousse) pourraient réserver quelques surprises.',
  },
  'peu-favorable': {
    label: 'Peu favorable',
    color: '#ae2012',
    emoji: '😕',
    advice: 'Conditions défavorables. Il vaut mieux attendre de nouvelles pluies suivies de douceur pour espérer une pousse significative.',
  },
  'defavorable': {
    label: 'Défavorable',
    color: '#9b2226',
    emoji: '❌',
    advice: 'Conditions très défavorables. Il vaut mieux attendre de nouvelles pluies suivies de douceur pour espérer une pousse significative.',
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
