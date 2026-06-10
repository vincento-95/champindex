// ============================================================
// ChampIndex — Scoring universel multi-catégorie
//
// Champignons : humidité sol, déclencheur pluie 72h, choc thermique
// Plantes : température soutenue, humidité modérée, ensoleillement
// Baies : chaleur accumulée, maturité saisonnière, soleil récent
// ============================================================

import type { WeatherScore, WeatherScoreDetail, ScoreLevel, ScoreLevelInfo, ForagingCategory } from '../types';
import type { HeatmapStats } from './heatmap-api';

/** WeatherData with optional ET0 field (present in forecast API, absent from type) */
interface WeatherDataInput {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    precipitation_probability_max?: number[];
    et0_fao_evapotranspiration?: number[];
  };
}

// ── Helpers ──

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  return arr.length ? sum(arr) / arr.length : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ============================================================
// SCORING DÉTAILLÉ (vue résultats) — 5 facteurs, /100
// ============================================================

export function computeWeatherScoreForCategory(
  weatherData: WeatherDataInput,
  category: ForagingCategory,
): WeatherScore {
  const daily = weatherData.daily;
  const month = new Date().getMonth() + 1;

  if (category === 'mushroom') return computeMushroomWeatherScore(daily, month);
  if (category === 'plant') return computePlantWeatherScore(daily, month);
  return computeBerryWeatherScore(daily, month);
}

// ── Champignons (existant, inchangé) ──

function computeMushroomWeatherScore(daily: WeatherDataInput['daily'], month: number): WeatherScore {
  const details: WeatherScoreDetail[] = [];

  const rain14 = sum(daily.precipitation_sum.slice(-14));
  let r14s: number, r14i: WeatherScoreDetail['impact'];
  if (rain14 >= 40 && rain14 <= 80) { r14s = 30; r14i = '++'; }
  else if (rain14 >= 25 && rain14 < 40) { r14s = 22; r14i = '+'; }
  else if (rain14 > 80 && rain14 <= 120) { r14s = 18; r14i = '+'; }
  else if (rain14 >= 10 && rain14 < 25) { r14s = 10; r14i = '-'; }
  else if (rain14 < 10) { r14s = 2; r14i = '--'; }
  else { r14s = 8; r14i = '-'; }
  details.push({ factor: 'rain14', label: 'Pluie 14 jours', value: `${rain14.toFixed(0)} mm`, score: r14s, maxScore: 30, impact: r14i });

  const rain3 = sum(daily.precipitation_sum.slice(-3));
  let r3s: number, r3i: WeatherScoreDetail['impact'];
  if (rain3 >= 10 && rain3 <= 30) { r3s = 20; r3i = '++'; }
  else if (rain3 >= 5 && rain3 < 10) { r3s = 14; r3i = '+'; }
  else if (rain3 > 30) { r3s = 10; r3i = '~'; }
  else { r3s = 3; r3i = '--'; }
  details.push({ factor: 'rain3', label: 'Pluie 3 jours', value: `${rain3.toFixed(0)} mm`, score: r3s, maxScore: 20, impact: r3i });

  const avgTemp7 = mean(daily.temperature_2m_mean.slice(-7));
  const idealRange: [number, number] = (month >= 9 || month <= 2) ? [8, 18] : [14, 22];
  let ts: number, ti: WeatherScoreDetail['impact'];
  if (avgTemp7 >= idealRange[0] && avgTemp7 <= idealRange[1]) { ts = 25; ti = '++'; }
  else if (avgTemp7 >= idealRange[0] - 4 && avgTemp7 <= idealRange[1] + 4) { ts = 16; ti = '+'; }
  else if (avgTemp7 < 3) { ts = 3; ti = '--'; }
  else { ts = 8; ti = '-'; }
  details.push({ factor: 'temperature', label: 'Température 7j', value: `${avgTemp7.toFixed(1)}°C`, score: ts, maxScore: 25, impact: ti });

  const amplitudes = daily.temperature_2m_max.slice(-7).map((max, i) => max - daily.temperature_2m_min.slice(-7)[i]);
  const amp = mean(amplitudes);
  let as: number, ai: WeatherScoreDetail['impact'];
  if (amp >= 8 && amp <= 15) { as = 15; ai = '++'; }
  else if (amp >= 5 && amp < 8) { as = 10; ai = '+'; }
  else { as = 5; ai = '-'; }
  details.push({ factor: 'amplitude', label: 'Amplitude jour/nuit', value: `${amp.toFixed(1)}°C`, score: as, maxScore: 15, impact: ai });

  let ss: number, si: WeatherScoreDetail['impact'];
  if ([9, 10, 11].includes(month)) { ss = 10; si = '++'; }
  else if ([4, 5, 6, 7, 8].includes(month)) { ss = 6; si = '+'; }
  else { ss = 2; si = '-'; }
  const seasonLabels: Record<number, string> = { 1:'Hiver',2:'Hiver',3:'Début printemps',4:'Printemps',5:'Printemps',6:'Été',7:'Été',8:'Fin été',9:'Automne',10:'Automne',11:'Automne',12:'Hiver' };
  details.push({ factor: 'season', label: 'Saison', value: seasonLabels[month], score: ss, maxScore: 10, impact: si });

  return { total: Math.min(100, r14s + r3s + ts + as + ss), details };
}

// ── Plantes sauvages ──

function computePlantWeatherScore(daily: WeatherDataInput['daily'], month: number): WeatherScore {
  const details: WeatherScoreDetail[] = [];

  // 1. TEMPÉRATURE (max 30 pts) — les plantes poussent dans des fenêtres larges
  const avgTemp7 = mean(daily.temperature_2m_mean.slice(-7));
  const isSpring = month >= 3 && month <= 5;
  const isSummer = month >= 6 && month <= 8;
  const idealMin = isSpring ? 8 : isSummer ? 15 : 5;
  const idealMax = isSpring ? 22 : isSummer ? 32 : 18;
  let ts: number, ti: WeatherScoreDetail['impact'];
  if (avgTemp7 >= idealMin && avgTemp7 <= idealMax) { ts = 30; ti = '++'; }
  else if (avgTemp7 >= idealMin - 4 && avgTemp7 <= idealMax + 4) { ts = 20; ti = '+'; }
  else if (avgTemp7 < 2) { ts = 2; ti = '--'; }
  else { ts = 10; ti = '-'; }
  details.push({ factor: 'temperature', label: 'Température 7j', value: `${avgTemp7.toFixed(1)}°C`, score: ts, maxScore: 30, impact: ti });

  // 2. SAISONNALITÉ (max 25 pts) — critique pour les plantes
  const plantPeaks = [3, 4, 5, 6]; // printemps = pic cueillette plantes
  const plantGood = [7, 8, 9, 10];
  let ss: number, si: WeatherScoreDetail['impact'];
  if (plantPeaks.includes(month)) { ss = 25; si = '++'; }
  else if (plantGood.includes(month)) { ss = 15; si = '+'; }
  else { ss = 5; si = '-'; }
  details.push({ factor: 'season', label: 'Saison', value: `${isSpring ? 'Printemps' : isSummer ? 'Été' : month >= 9 ? 'Automne' : 'Hiver'}`, score: ss, maxScore: 25, impact: si });

  // 3. HUMIDITÉ MODÉRÉE (max 20 pts) — ni trop sec ni inondé
  const rain14 = sum(daily.precipitation_sum.slice(-14));
  let hs: number, hi: WeatherScoreDetail['impact'];
  if (rain14 >= 15 && rain14 <= 60) { hs = 20; hi = '++'; }
  else if (rain14 >= 5 && rain14 < 15) { hs = 14; hi = '+'; }
  else if (rain14 > 60 && rain14 <= 100) { hs = 12; hi = '~'; }
  else if (rain14 < 5) { hs = 4; hi = '--'; }
  else { hs = 6; hi = '-'; }
  details.push({ factor: 'moisture', label: 'Humidité 14j', value: `${rain14.toFixed(0)} mm`, score: hs, maxScore: 20, impact: hi });

  // 4. ENSOLEILLEMENT (max 15 pts) — ET0 élevé = soleil, bon pour la croissance
  const et0_7d = daily.et0_fao_evapotranspiration ? sum(daily.et0_fao_evapotranspiration.slice(-7)) : 20;
  let ls: number, li: WeatherScoreDetail['impact'];
  if (et0_7d >= 15 && et0_7d <= 35) { ls = 15; li = '++'; }
  else if (et0_7d >= 10 && et0_7d < 15) { ls = 10; li = '+'; }
  else if (et0_7d > 35) { ls = 8; li = '~'; }
  else { ls = 4; li = '-'; }
  details.push({ factor: 'sunlight', label: 'Ensoleillement', value: `ET0 ${et0_7d.toFixed(0)} mm`, score: ls, maxScore: 15, impact: li });

  // 5. CROISSANCE SOUTENUE (max 10 pts) — température régulière sur 14j
  const temps14 = daily.temperature_2m_mean.slice(-14);
  const tempVariance = temps14.length > 1 ? mean(temps14.map(t => Math.abs(t - mean(temps14)))) : 0;
  let gs: number, gi: WeatherScoreDetail['impact'];
  if (tempVariance < 3) { gs = 10; gi = '++'; }
  else if (tempVariance < 5) { gs = 7; gi = '+'; }
  else { gs = 3; gi = '-'; }
  details.push({ factor: 'stability', label: 'Stabilité thermique', value: `±${tempVariance.toFixed(1)}°C`, score: gs, maxScore: 10, impact: gi });

  return { total: Math.min(100, ts + ss + hs + ls + gs), details };
}

// ── Baies & fruits sauvages ──

function computeBerryWeatherScore(daily: WeatherDataInput['daily'], month: number): WeatherScore {
  const details: WeatherScoreDetail[] = [];

  // 1. CHALEUR ACCUMULÉE (max 25 pts) — GDD proxy: somme des temp moyennes > 5°C
  const temps14 = daily.temperature_2m_mean.slice(-14);
  const gdd = sum(temps14.map(t => Math.max(0, t - 5)));
  let gs: number, gi: WeatherScoreDetail['impact'];
  if (gdd >= 120 && gdd <= 250) { gs = 25; gi = '++'; }
  else if (gdd >= 80 && gdd < 120) { gs = 18; gi = '+'; }
  else if (gdd > 250) { gs = 15; gi = '~'; }
  else if (gdd >= 40) { gs = 10; gi = '-'; }
  else { gs = 3; gi = '--'; }
  details.push({ factor: 'warmth', label: 'Chaleur accumulée', value: `GDD ${gdd.toFixed(0)}`, score: gs, maxScore: 25, impact: gi });

  // 2. SAISONNALITÉ (max 25 pts) — baies très saisonnières
  const berryPeaks = [7, 8, 9]; // été-automne
  const berryGood = [6, 10, 11];
  let ss: number, si: WeatherScoreDetail['impact'];
  if (berryPeaks.includes(month)) { ss = 25; si = '++'; }
  else if (berryGood.includes(month)) { ss = 15; si = '+'; }
  else { ss = 3; si = '--'; }
  details.push({ factor: 'season', label: 'Saison', value: berryPeaks.includes(month) ? 'Pic de maturité' : berryGood.includes(month) ? 'Saison favorable' : 'Hors saison', score: ss, maxScore: 25, impact: si });

  // 3. ENSOLEILLEMENT RÉCENT (max 20 pts) — soleil = maturation
  const rain3 = sum(daily.precipitation_sum.slice(-3));
  const avgTemp3 = mean(daily.temperature_2m_mean.slice(-3));
  let ls: number, li: WeatherScoreDetail['impact'];
  if (rain3 < 5 && avgTemp3 >= 15) { ls = 20; li = '++'; }
  else if (rain3 < 10 && avgTemp3 >= 12) { ls = 14; li = '+'; }
  else if (rain3 < 20) { ls = 8; li = '~'; }
  else { ls = 3; li = '-'; }
  details.push({ factor: 'ripening', label: 'Maturation (soleil 3j)', value: `${rain3.toFixed(0)} mm pluie, ${avgTemp3.toFixed(0)}°C`, score: ls, maxScore: 20, impact: li });

  // 4. TEMPÉRATURE (max 15 pts) — chaleur modérée
  const avgTemp7 = mean(daily.temperature_2m_mean.slice(-7));
  let ts: number, ti: WeatherScoreDetail['impact'];
  if (avgTemp7 >= 15 && avgTemp7 <= 28) { ts = 15; ti = '++'; }
  else if (avgTemp7 >= 10 && avgTemp7 < 15) { ts = 10; ti = '+'; }
  else if (avgTemp7 > 28 && avgTemp7 <= 35) { ts = 8; ti = '~'; }
  else { ts = 3; ti = '-'; }
  details.push({ factor: 'temperature', label: 'Température 7j', value: `${avgTemp7.toFixed(1)}°C`, score: ts, maxScore: 15, impact: ti });

  // 5. HUMIDITÉ MODÉRÉE (max 15 pts)
  const rain14 = sum(daily.precipitation_sum.slice(-14));
  let hs: number, hi: WeatherScoreDetail['impact'];
  if (rain14 >= 10 && rain14 <= 50) { hs = 15; hi = '++'; }
  else if (rain14 >= 5 && rain14 < 10) { hs = 10; hi = '+'; }
  else if (rain14 > 50 && rain14 <= 80) { hs = 8; hi = '~'; }
  else { hs = 3; hi = '-'; }
  details.push({ factor: 'moisture', label: 'Humidité 14j', value: `${rain14.toFixed(0)} mm`, score: hs, maxScore: 15, impact: hi });

  return { total: Math.min(100, gs + ss + ls + ts + hs), details };
}

// ============================================================
// SCORING HEATMAP — probabilité par catégorie (0-100)
// ============================================================

export function computeHeatmapProbability(
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; temperature_2m_mean: number[]; precipitation_sum: number[]; et0_fao_evapotranspiration: number[] },
  category: ForagingCategory,
): { score: number; stats: HeatmapStats } {
  // Stats communes
  const rain14d = sum(daily.precipitation_sum.slice(-14));
  const rain3d = sum(daily.precipitation_sum.slice(-3));
  const temps7 = daily.temperature_2m_mean.slice(-7);
  const tempMean7d = mean(temps7);
  const tempBefore = mean(daily.temperature_2m_mean.slice(-7, -3));
  const tempRecent = mean(daily.temperature_2m_mean.slice(-3));
  const tempDrop = tempBefore - tempRecent;
  const wetDays7 = daily.precipitation_sum.slice(-7).filter(r => r >= 1.0).length;
  const maxTemps = daily.temperature_2m_max.slice(-7);
  const minTemps = daily.temperature_2m_min.slice(-7);
  const amplitude = mean(maxTemps.map((max, i) => max - minTemps[i]));
  const et0_7d = sum(daily.et0_fao_evapotranspiration.slice(-7));
  const rain10d = sum(daily.precipitation_sum.slice(-10));
  const et0_10d = sum(daily.et0_fao_evapotranspiration.slice(-10));
  const soilBalance = rain10d - et0_10d;

  const stats: HeatmapStats = { rain14d, rain3d, tempMean7d, tempDrop, wetDays7, amplitude, et0_7d, soilBalance };
  const month = new Date().getMonth() + 1;

  let score: number;
  if (category === 'mushroom') {
    score = scoreMushroom(stats, month);
  } else if (category === 'plant') {
    score = scorePlant(stats, month);
  } else {
    score = scoreBerry(stats, month, daily);
  }

  return { score: clamp(score, 0, 100), stats };
}

// ── Mushroom heatmap scoring (existant, inchangé) ──

function scoreMushroom(s: HeatmapStats, month: number): number {
  // 1. Bilan hydrique sol (25 pts)
  let soilScore: number;
  if (s.soilBalance >= 15 && s.soilBalance <= 50) soilScore = 25;
  else if (s.soilBalance >= 5 && s.soilBalance < 15) soilScore = 18;
  else if (s.soilBalance > 50 && s.soilBalance <= 80) soilScore = 16;
  else if (s.soilBalance >= 0 && s.soilBalance < 5) soilScore = 10;
  else if (s.soilBalance > 80) soilScore = 8;
  else if (s.soilBalance >= -10) soilScore = 4;
  else soilScore = 0;

  // 2. Déclencheur pluie 72h (20 pts)
  let triggerScore: number;
  if (s.rain3d >= 8 && s.rain3d <= 25) triggerScore = 20;
  else if (s.rain3d >= 5 && s.rain3d < 8) triggerScore = 14;
  else if (s.rain3d > 25 && s.rain3d <= 45) triggerScore = 12;
  else if (s.rain3d >= 2 && s.rain3d < 5) triggerScore = 6;
  else if (s.rain3d > 45) triggerScore = 5;
  else triggerScore = 0;

  // 3. Température (20 pts)
  const isAutumn = month >= 9 || month <= 2;
  const idealMin = isAutumn ? 5 : 12;
  const idealMax = isAutumn ? 16 : 22;
  let tempScore: number;
  if (s.tempMean7d >= idealMin && s.tempMean7d <= idealMax) tempScore = 20;
  else {
    const dist = s.tempMean7d < idealMin ? idealMin - s.tempMean7d : s.tempMean7d - idealMax;
    tempScore = Math.max(0, Math.round(20 - dist * 3));
  }

  // 4. Choc thermique (15 pts)
  let shockScore: number;
  if (s.tempDrop >= 3 && s.tempDrop <= 8) shockScore = 15;
  else if (s.tempDrop >= 1.5 && s.tempDrop < 3) shockScore = 9;
  else if (s.tempDrop > 8 && s.tempDrop <= 12) shockScore = 8;
  else if (s.tempDrop >= 0.5) shockScore = 4;
  else shockScore = 1;

  // 5. Régularité (10 pts)
  let regScore: number;
  if (s.wetDays7 >= 4 && s.wetDays7 <= 6) regScore = 10;
  else if (s.wetDays7 === 3) regScore = 7;
  else if (s.wetDays7 === 7) regScore = 6;
  else if (s.wetDays7 === 2) regScore = 4;
  else if (s.wetDays7 === 1) regScore = 2;
  else regScore = 0;

  // 6. Saisonnalité (10 pts)
  let seasonScore: number;
  if ([9, 10, 11].includes(month)) seasonScore = 10;
  else if ([4, 5].includes(month)) seasonScore = 7;
  else if ([6, 7, 8].includes(month)) seasonScore = 6;
  else if (month === 3) seasonScore = 4;
  else seasonScore = 2;

  return soilScore + triggerScore + tempScore + shockScore + regScore + seasonScore;
}

// ── Plant heatmap scoring ──

function scorePlant(s: HeatmapStats, month: number): number {
  // 1. Température (25 pts) — fenêtre large
  const isSpring = month >= 3 && month <= 5;
  const isSummer = month >= 6 && month <= 8;
  const idealMin = isSpring ? 8 : isSummer ? 15 : 5;
  const idealMax = isSpring ? 22 : isSummer ? 32 : 18;
  let tempScore: number;
  if (s.tempMean7d >= idealMin && s.tempMean7d <= idealMax) tempScore = 25;
  else {
    const dist = s.tempMean7d < idealMin ? idealMin - s.tempMean7d : s.tempMean7d - idealMax;
    tempScore = Math.max(0, Math.round(25 - dist * 3));
  }

  // 2. Saisonnalité (25 pts) — printemps pic
  let seasonScore: number;
  if ([3, 4, 5, 6].includes(month)) seasonScore = 25;
  else if ([7, 8, 9, 10].includes(month)) seasonScore = 15;
  else seasonScore = 5;

  // 3. Humidité modérée (20 pts) — ni sec ni inondé
  let moistScore: number;
  if (s.soilBalance >= 0 && s.soilBalance <= 30) moistScore = 20;
  else if (s.soilBalance > 30 && s.soilBalance <= 60) moistScore = 14;
  else if (s.soilBalance >= -10 && s.soilBalance < 0) moistScore = 12;
  else if (s.soilBalance > 60) moistScore = 8;
  else moistScore = 4;

  // 4. Ensoleillement (15 pts) — ET0 comme proxy
  let sunScore: number;
  if (s.et0_7d >= 15 && s.et0_7d <= 35) sunScore = 15;
  else if (s.et0_7d >= 10 && s.et0_7d < 15) sunScore = 10;
  else if (s.et0_7d > 35) sunScore = 8;
  else sunScore = 4;

  // 5. Régularité pluie (15 pts) — pluie régulière pour la croissance
  let regScore: number;
  if (s.wetDays7 >= 2 && s.wetDays7 <= 4) regScore = 15;
  else if (s.wetDays7 === 5) regScore = 10;
  else if (s.wetDays7 === 1) regScore = 8;
  else if (s.wetDays7 === 0) regScore = 3;
  else regScore = 6;

  return tempScore + seasonScore + moistScore + sunScore + regScore;
}

// ── Berry heatmap scoring ──

function scoreBerry(
  s: HeatmapStats,
  month: number,
  daily: { temperature_2m_mean: number[] },
): number {
  // 1. Chaleur accumulée (25 pts) — GDD proxy
  const gdd = sum(daily.temperature_2m_mean.slice(-14).map(t => Math.max(0, t - 5)));
  let warmthScore: number;
  if (gdd >= 120 && gdd <= 250) warmthScore = 25;
  else if (gdd >= 80 && gdd < 120) warmthScore = 18;
  else if (gdd > 250) warmthScore = 15;
  else if (gdd >= 40) warmthScore = 10;
  else warmthScore = 3;

  // 2. Saisonnalité (25 pts) — été-automne
  let seasonScore: number;
  if ([7, 8, 9].includes(month)) seasonScore = 25;
  else if ([6, 10, 11].includes(month)) seasonScore = 15;
  else seasonScore = 3;

  // 3. Soleil récent (20 pts) — peu de pluie + chaleur = maturation
  let ripeScore: number;
  if (s.rain3d < 5 && s.tempMean7d >= 15) ripeScore = 20;
  else if (s.rain3d < 10 && s.tempMean7d >= 12) ripeScore = 14;
  else if (s.rain3d < 20) ripeScore = 8;
  else ripeScore = 3;

  // 4. Température (15 pts)
  let tempScore: number;
  if (s.tempMean7d >= 15 && s.tempMean7d <= 28) tempScore = 15;
  else if (s.tempMean7d >= 10 && s.tempMean7d < 15) tempScore = 10;
  else if (s.tempMean7d > 28) tempScore = 8;
  else tempScore = 3;

  // 5. Humidité modérée (15 pts) — pas trop de pluie
  let moistScore: number;
  if (s.rain14d >= 10 && s.rain14d <= 50) moistScore = 15;
  else if (s.rain14d >= 5 && s.rain14d < 10) moistScore = 10;
  else if (s.rain14d > 50 && s.rain14d <= 80) moistScore = 8;
  else moistScore = 3;

  return warmthScore + seasonScore + ripeScore + tempScore + moistScore;
}

// ============================================================
// NIVEAUX DE SCORE PAR CATÉGORIE
// ============================================================

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'exceptionnel';
  if (score >= 65) return 'tres-favorable';
  if (score >= 50) return 'favorable';
  if (score >= 35) return 'moyen';
  if (score >= 20) return 'peu-favorable';
  return 'defavorable';
}

export const SCORE_LEVELS_BY_CATEGORY: Record<ForagingCategory, Record<ScoreLevel, ScoreLevelInfo>> = {
  mushroom: {
    'exceptionnel': { label: 'Exceptionnel', color: '#2d6a4f', emoji: '🍄🍄🍄', advice: 'Conditions exceptionnelles ! Les champignons devraient être au rendez-vous. Privilégiez les sous-bois de feuillus et les lisières après une pluie récente.' },
    'tres-favorable': { label: 'Très favorable', color: '#40916c', emoji: '🍄🍄', advice: 'Très favorable. Ciblez les pentes douces orientées nord, les fonds de vallées et les pieds de chênes et hêtres.' },
    'favorable': { label: 'Favorable', color: '#6a994e', emoji: '🍄', advice: 'Conditions correctes. Cherchez les zones ombragées et humides : bords de ruisseaux, mousse épaisse, sous-bois denses.' },
    'moyen': { label: 'Moyen', color: '#bc6c25', emoji: '🤔', advice: 'Conditions moyennes. Seuls les coins les plus humides pourraient réserver quelques surprises.' },
    'peu-favorable': { label: 'Peu favorable', color: '#ae2012', emoji: '😕', advice: 'Conditions défavorables. Attendez de nouvelles pluies suivies de douceur.' },
    'defavorable': { label: 'Défavorable', color: '#9b2226', emoji: '❌', advice: 'Conditions très défavorables. Patience, la prochaine pluie changera tout.' },
  },
  plant: {
    'exceptionnel': { label: 'Croissance optimale', color: '#2d6a4f', emoji: '🌿🌿🌿', advice: 'Conditions idéales pour la cueillette ! Les plantes sont en pleine croissance. Privilégiez les sous-bois frais et les prairies humides.' },
    'tres-favorable': { label: 'Très favorable', color: '#40916c', emoji: '🌿🌿', advice: 'Très bonnes conditions. Les jeunes pousses et feuilles tendres sont à leur meilleur.' },
    'favorable': { label: 'Favorable', color: '#6a994e', emoji: '🌿', advice: 'Conditions favorables. Cherchez les zones abritées et humides pour les meilleures récoltes.' },
    'moyen': { label: 'Moyen', color: '#bc6c25', emoji: '🤔', advice: 'Conditions moyennes. Concentrez-vous sur les espèces résistantes et les zones protégées.' },
    'peu-favorable': { label: 'Peu favorable', color: '#ae2012', emoji: '😕', advice: 'Peu de plantes en condition de cueillette. Privilégiez les espèces robustes.' },
    'defavorable': { label: 'Défavorable', color: '#9b2226', emoji: '❌', advice: 'Hors saison ou conditions trop rudes pour la cueillette de plantes.' },
  },
  berry: {
    'exceptionnel': { label: 'Maturité parfaite', color: '#2d6a4f', emoji: '🫐🫐🫐', advice: 'Les baies sont à maturité parfaite ! Soleil récent + chaleur accumulée = fruits sucrés et juteux. Foncez !' },
    'tres-favorable': { label: 'Très favorable', color: '#40916c', emoji: '🫐🫐', advice: 'Excellentes conditions de maturation. Les fruits devraient être bien mûrs dans les endroits ensoleillés.' },
    'favorable': { label: 'Favorable', color: '#6a994e', emoji: '🫐', advice: 'Conditions correctes. Cherchez les expositions sud et les lisières ensoleillées.' },
    'moyen': { label: 'Moyen', color: '#bc6c25', emoji: '🤔', advice: 'Maturation incomplète possible. Certains fruits peuvent être encore acides.' },
    'peu-favorable': { label: 'Peu favorable', color: '#ae2012', emoji: '😕', advice: 'Trop de pluie ou pas assez de chaleur pour une bonne maturation.' },
    'defavorable': { label: 'Défavorable', color: '#9b2226', emoji: '❌', advice: 'Hors saison ou conditions inadaptées à la maturation des fruits.' },
  },
};
