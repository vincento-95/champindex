// ============================================================
// ChampIndex — API batch heatmap + scoring mycologique
// ============================================================
//
// Scoring basé sur la littérature mycologique :
// - Kauserud et al. (2008) — fruiting phenology & climate
// - Boddy et al. (2014) — fungal responses to climate
// - Büntgen et al. (2012) — 700 years of fruiting data
//
// Facteurs clés :
// 1. Humidité du sol (cumul pluie 10j - évapotranspiration)
// 2. Déclencheur récent (pluie 72h)
// 3. Température dans la fenêtre de fructification
// 4. Choc thermique (chute température = déclencheur)
// 5. Régularité des pluies (jours humides consécutifs)
// 6. Saisonnalité (mois de l'année)
// ============================================================

import type { ForestPoint } from '../data/forest-points';
import { FOREST_POINTS } from '../data/forest-points';
import type { ForagingCategory } from '../types';
import { computeHeatmapProbability } from './foraging-scoring';

// --- Types ---

export interface HeatmapStats {
  rain14d: number;      // mm cumul 14 jours
  rain3d: number;       // mm cumul 3 derniers jours
  tempMean7d: number;   // °C moyenne 7 jours
  tempDrop: number;     // °C chute température (positif = refroidissement)
  wetDays7: number;     // nombre de jours de pluie sur 7
  amplitude: number;    // °C amplitude jour/nuit moyenne
  et0_7d: number;       // mm évapotranspiration 7 jours
  soilBalance: number;  // mm (pluie - évapotranspiration) sur 10j
}

export interface HeatmapPointData {
  id: number;
  lat: number;
  lon: number;
  name: string;
  region: string;
  score: number;          // 0-100 probabilité champignons
  stats: HeatmapStats;
  essences: string[];     // essences dominantes de la forêt
  /** true si le score repose sur des données simulées (météo indisponible) */
  simulated?: boolean;
}

interface BatchWeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  temperature_2m_mean: number[];
  precipitation_sum: number[];
  et0_fao_evapotranspiration: number[];
}

interface BatchWeatherResponse {
  latitude: number;
  longitude: number;
  daily: BatchWeatherDaily;
  /** true si les données sont issues du fallback simulé (API indisponible) */
  simulated?: boolean;
}

interface CachedHeatmapData {
  timestamp: number;
  points: HeatmapPointData[];
}

interface CachedWeatherData {
  timestamp: number;
  weather: BatchWeatherResponse[];
}

// --- Constantes ---

// v7/v4 : purge les caches antérieurs au fix « données simulées persistées »
const CACHE_KEY = 'champindex_heatmap_v7';
const WEATHER_CACHE_KEY = 'champindex_weather_raw_v4';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures — la météo ne change pas toutes les heures
const BATCH_SIZE = 300;
// La limite Open-Meteo gratuite est PAR MINUTE et chaque coordonnée d'un
// batch compte comme un appel (~450 points par chargement complet) :
// séquencer les batches pour rester sous le quota.
const CONCURRENCY = 1;
const BATCH_DELAY_MS = 500;

// --- WFS IGN pour click-anywhere ---

const WFS_BASE = 'https://data.geopf.fr/wfs/ows';

// Mapping IGN essence → interne (pour le click-anywhere)
const IGN_ESSENCE_MAP: Record<string, string | null> = {
  'Pin maritime': 'pin maritime',
  'Pin sylvestre': 'pin sylvestre',
  'Pin laricio': 'pin sylvestre',
  'Pin laricio, pin noir': 'pin sylvestre',
  'Pin noir': 'pin sylvestre',
  'Pin à crochets': 'pin sylvestre',
  'Pin pignon, pin parasol': 'pin sylvestre',
  'Pins mélangés': 'pin sylvestre',
  "Pin d'Alep": 'pin sylvestre',
  'Epicéa commun': 'épicéa',
  'Epicéa de Sitka': 'épicéa',
  'Sapin pectiné': 'sapin',
  'Douglas': 'sapin',
  'Mélèze': 'mélèze',
  'Hêtre': 'hêtre',
  'Châtaignier': 'châtaignier',
  'Chênes décidus': 'chêne',
  'Chênes sempervirents': 'chêne vert',
  'Charme': 'charme',
  'Frêne': 'frêne',
  'Bouleau': 'bouleau',
  'Noisetier': 'noisetier',
};

function mapIgnEssence(ignEssence: string): string[] {
  if (ignEssence === 'Sapin, épicéa') return ['sapin', 'épicéa'];
  const mapped = IGN_ESSENCE_MAP[ignEssence];
  return mapped ? [mapped] : [];
}

// --- Helpers ---

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Scoring mycologique ---

/**
 * Calcule la probabilité de trouver des champignons (0-100)
 * basé sur 6 facteurs pondérés scientifiquement.
 */
function computeMushroomProbability(daily: BatchWeatherDaily): {
  score: number;
  stats: HeatmapStats;
} {
  // === EXTRAIRE LES STATS BRUTES ===

  const rain14d = sum(daily.precipitation_sum.slice(-14));
  const rain3d = sum(daily.precipitation_sum.slice(-3));

  const temps7 = daily.temperature_2m_mean.slice(-7);
  const tempMean7d = mean(temps7);

  // Chute de température : moyenne jours -6 à -4 vs jours -3 à -1
  const tempBefore = mean(daily.temperature_2m_mean.slice(-7, -3));
  const tempRecent = mean(daily.temperature_2m_mean.slice(-3));
  const tempDrop = tempBefore - tempRecent; // positif = refroidissement

  // Jours de pluie sur 7
  const last7Rain = daily.precipitation_sum.slice(-7);
  const wetDays7 = last7Rain.filter(r => r >= 1.0).length;

  // Amplitude thermique jour/nuit
  const maxTemps = daily.temperature_2m_max.slice(-7);
  const minTemps = daily.temperature_2m_min.slice(-7);
  const amplitudes = maxTemps.map((max, i) => max - minTemps[i]);
  const amplitude = mean(amplitudes);

  // Évapotranspiration
  const et0_7d = sum(daily.et0_fao_evapotranspiration.slice(-7));

  // Bilan hydrique sol : pluie 10j - ET0 10j
  const rain10d = sum(daily.precipitation_sum.slice(-10));
  const et0_10d = sum(daily.et0_fao_evapotranspiration.slice(-10));
  const soilBalance = rain10d - et0_10d;

  const stats: HeatmapStats = {
    rain14d,
    rain3d,
    tempMean7d,
    tempDrop,
    wetDays7,
    amplitude,
    et0_7d,
    soilBalance,
  };

  // === SCORING (6 facteurs) ===

  const month = new Date().getMonth() + 1;

  // 1. BILAN HYDRIQUE DU SOL (max 25 pts)
  //    Le facteur le plus important. Pluie - évaporation = eau disponible.
  //    Idéal : +15 à +40mm de surplus. Négatif = sol trop sec.
  let soilScore: number;
  if (soilBalance >= 15 && soilBalance <= 50) {
    soilScore = 25;
  } else if (soilBalance >= 5 && soilBalance < 15) {
    soilScore = 18;
  } else if (soilBalance > 50 && soilBalance <= 80) {
    soilScore = 16; // trop d'eau → lessivage
  } else if (soilBalance >= 0 && soilBalance < 5) {
    soilScore = 10;
  } else if (soilBalance > 80) {
    soilScore = 8;  // inondation
  } else if (soilBalance >= -10 && soilBalance < 0) {
    soilScore = 4;  // sol sec
  } else {
    soilScore = 0;  // sol très sec
  }

  // 2. DÉCLENCHEUR PLUIE 72H (max 20 pts)
  //    Les champignons apparaissent 3-7 jours après une pluie significative.
  //    Il faut >5mm sur 3 jours pour déclencher la fructification.
  let triggerScore: number;
  if (rain3d >= 8 && rain3d <= 25) {
    triggerScore = 20;
  } else if (rain3d >= 5 && rain3d < 8) {
    triggerScore = 14;
  } else if (rain3d > 25 && rain3d <= 45) {
    triggerScore = 12; // beaucoup mais ok
  } else if (rain3d >= 2 && rain3d < 5) {
    triggerScore = 6;
  } else if (rain3d > 45) {
    triggerScore = 5;  // trop
  } else {
    triggerScore = 0;  // pas de déclencheur
  }

  // 3. TEMPÉRATURE DANS LA FENÊTRE DE FRUCTIFICATION (max 20 pts)
  //    Automne/hiver : 5-16°C idéal (cèpes, girolles d'automne)
  //    Printemps/été : 12-22°C idéal (morilles, girolles d'été)
  const isAutumn = month >= 9 || month <= 2;
  const idealMin = isAutumn ? 5 : 12;
  const idealMax = isAutumn ? 16 : 22;
  let tempScore: number;
  if (tempMean7d >= idealMin && tempMean7d <= idealMax) {
    tempScore = 20;
  } else {
    const dist = tempMean7d < idealMin
      ? idealMin - tempMean7d
      : tempMean7d - idealMax;
    tempScore = Math.max(0, 20 - dist * 3); // -3 pts par °C d'écart
  }
  tempScore = Math.round(tempScore);

  // 4. CHOC THERMIQUE (max 15 pts)
  //    Une chute de température de 3-8°C en quelques jours est un
  //    puissant déclencheur de fructification (stress hydrique du mycélium).
  let shockScore: number;
  if (tempDrop >= 3 && tempDrop <= 8) {
    shockScore = 15;
  } else if (tempDrop >= 1.5 && tempDrop < 3) {
    shockScore = 9;
  } else if (tempDrop > 8 && tempDrop <= 12) {
    shockScore = 8; // trop brutal
  } else if (tempDrop >= 0.5 && tempDrop < 1.5) {
    shockScore = 4;
  } else {
    shockScore = 1; // pas de choc ou réchauffement
  }

  // 5. RÉGULARITÉ DES PLUIES (max 10 pts)
  //    Mieux vaut 5 jours à 3mm que 1 jour à 15mm.
  //    Le mycélium a besoin d'humidité constante.
  let regularityScore: number;
  if (wetDays7 >= 4 && wetDays7 <= 6) {
    regularityScore = 10;
  } else if (wetDays7 === 3) {
    regularityScore = 7;
  } else if (wetDays7 === 7) {
    regularityScore = 6; // trop → lessivage
  } else if (wetDays7 === 2) {
    regularityScore = 4;
  } else if (wetDays7 === 1) {
    regularityScore = 2;
  } else {
    regularityScore = 0;
  }

  // 6. SAISONNALITÉ (max 10 pts)
  //    Sep-Nov : pic absolu (toutes espèces)
  //    Mars-Mai : morilles, mousserons
  //    Juin-Août : girolles, cèpes d'été
  //    Déc-Fév : trompettes, pieds de mouton (certaines régions)
  let seasonScore: number;
  if ([9, 10, 11].includes(month)) {
    seasonScore = 10; // pic automnal
  } else if ([4, 5].includes(month)) {
    seasonScore = 7;  // printemps (morilles)
  } else if ([6, 7, 8].includes(month)) {
    seasonScore = 6;  // été (girolles)
  } else if (month === 3) {
    seasonScore = 4;  // début printemps
  } else {
    seasonScore = 2;  // hiver
  }

  const total = clamp(
    soilScore + triggerScore + tempScore + shockScore + regularityScore + seasonScore,
    0,
    100
  );

  return { score: total, stats };
}

// --- API ---

function buildBatchUrl(points: ForestPoint[]): string {
  const lats = points.map(p => p.lat.toFixed(4)).join(',');
  const lons = points.map(p => p.lon.toFixed(4)).join(',');

  return `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}`
    + `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration`
    + `&past_days=14&forecast_days=1&timezone=Europe%2FParis`;
}

function parseBatchResponse(data: unknown): BatchWeatherResponse[] {
  if (Array.isArray(data)) {
    return data as BatchWeatherResponse[];
  }
  return [data as BatchWeatherResponse];
}

async function fetchBatch(points: ForestPoint[], retries = 3): Promise<BatchWeatherResponse[]> {
  const url = buildBatchUrl(points);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        return parseBatchResponse(data);
      }

      // Rate limited (429) → attendre puis réessayer
      if (response.status === 429 && attempt < retries - 1) {
        const delay = (attempt + 1) * 3000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Échec API → fallback données simulées
      if (attempt === retries - 1) {
        console.warn(`Open-Meteo ${response.status} — fallback données simulées`);
        return generateFallbackWeather(points);
      }
    } catch {
      // Réseau inaccessible (ban IP, offline) → fallback
      if (attempt === retries - 1) {
        console.warn('Open-Meteo inaccessible — fallback données simulées');
        return generateFallbackWeather(points);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return generateFallbackWeather(points);
}

/**
 * Génère des données météo réalistes basées sur la latitude, la saison et
 * un bruit pseudo-aléatoire. Utilisé quand Open-Meteo est inaccessible.
 */
function generateFallbackWeather(points: ForestPoint[]): BatchWeatherResponse[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const days = 15;

  // Base températures par mois (France moyenne)
  const baseTemp: Record<number, number> = {
    1: 4, 2: 5, 3: 9, 4: 12, 5: 16, 6: 20,
    7: 22, 8: 22, 9: 18, 10: 13, 11: 8, 12: 5,
  };
  const base = baseTemp[month] || 12;

  return points.map(p => {
    // Variation par latitude (sud = plus chaud)
    const latBonus = (46.5 - p.lat) * 1.2;
    // Bruit pseudo-aléatoire stable par point
    const noise = Math.sin(p.lat * 100 + p.lon * 200) * 3;
    const temp = base + latBonus + noise;

    const times: string[] = [];
    const tempMax: number[] = [];
    const tempMin: number[] = [];
    const tempMean: number[] = [];
    const precip: number[] = [];
    const et0: number[] = [];

    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - d));
      times.push(date.toISOString().split('T')[0]);

      const dayNoise = Math.sin(d * 7 + p.lat * 50) * 2;
      const dayTemp = temp + dayNoise;
      tempMean.push(Math.round(dayTemp * 10) / 10);
      tempMax.push(Math.round((dayTemp + 5) * 10) / 10);
      tempMin.push(Math.round((dayTemp - 5) * 10) / 10);

      // Pluie : plus fréquente en automne, variable
      const rainChance = [1,2,3,10,11,12].includes(month) ? 0.5 : 0.3;
      const hasRain = Math.sin(d * 13 + p.lon * 80) > (1 - rainChance * 2) ? 1 : 0;
      precip.push(hasRain ? Math.round(Math.abs(Math.sin(d * 3 + p.lat * 20)) * 12 * 10) / 10 : 0);

      et0.push(Math.round(Math.max(0.5, base / 8 + Math.sin(d) * 0.5) * 10) / 10);
    }

    return {
      latitude: p.lat,
      longitude: p.lon,
      simulated: true,
      daily: {
        time: times,
        temperature_2m_max: tempMax,
        temperature_2m_min: tempMin,
        temperature_2m_mean: tempMean,
        precipitation_sum: precip,
        et0_fao_evapotranspiration: et0,
      },
    };
  });
}

// --- API publique ---

/**
 * Récupère les données météo brutes (cachées 6h, partagées entre catégories).
 * Un seul fetch pour les 3 catégories — seul le scoring diffère.
 */
async function fetchRawWeather(
  forceRefresh: boolean,
  onProgress?: (loaded: number, total: number) => void,
): Promise<BatchWeatherResponse[]> {
  // Vérifier le cache météo brut
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (raw) {
        const cached: CachedWeatherData = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.weather;
        }
        localStorage.removeItem(WEATHER_CACHE_KEY);
      }
    } catch { /* ignore */ }
  }

  const batches: ForestPoint[][] = [];
  for (let i = 0; i < FOREST_POINTS.length; i += BATCH_SIZE) {
    batches.push(FOREST_POINTS.slice(i, i + BATCH_SIZE));
  }

  const allWeatherData: BatchWeatherResponse[] = new Array(FOREST_POINTS.length);
  let loadedPoints = 0;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(batch => fetchBatch(batch)));

    let offset = i * BATCH_SIZE;
    for (const batchResult of results) {
      for (const item of batchResult) {
        allWeatherData[offset++] = item;
      }
    }

    loadedPoints = Math.min(FOREST_POINTS.length, (i + chunk.length) * BATCH_SIZE);
    onProgress?.(loadedPoints, FOREST_POINTS.length);

    if (i + CONCURRENCY < batches.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Sauvegarder les données météo brutes — mais JAMAIS les données simulées :
  // les persister 6h ferait passer de la météo inventée pour du temps réel
  // longtemps après que l'API soit redevenue disponible.
  const hasSimulated = allWeatherData.some(w => w?.simulated);
  if (!hasSimulated) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        weather: allWeatherData,
      } satisfies CachedWeatherData));
    } catch { /* localStorage full — ignore */ }
  }

  return allWeatherData;
}

/**
 * Scoring des points par catégorie (instantané, pas de requête réseau).
 */
function scorePoints(
  weather: BatchWeatherResponse[],
  category: ForagingCategory,
): HeatmapPointData[] {
  return FOREST_POINTS.map((fp, i) => {
    const w = weather[i];
    if (!w || !w.daily) {
      return {
        id: fp.id, lat: fp.lat, lon: fp.lon,
        name: fp.name, region: fp.region, score: 0,
        stats: { rain14d: 0, rain3d: 0, tempMean7d: 0, tempDrop: 0, wetDays7: 0, amplitude: 0, et0_7d: 0, soilBalance: 0 },
        essences: fp.essences,
      };
    }
    const { score, stats } = computeHeatmapProbability(w.daily, category);
    return { id: fp.id, lat: fp.lat, lon: fp.lon, name: fp.name, region: fp.region, score, stats, essences: fp.essences, simulated: w.simulated };
  });
}

export async function fetchBatchHeatmapData(
  forceRefresh = false,
  category: ForagingCategory = 'mushroom',
  onProgress?: (loaded: number, total: number) => void,
): Promise<HeatmapPointData[]> {
  // 1. Vérifier si on a déjà les points scorés en cache pour cette catégorie
  const scoredCacheKey = `${CACHE_KEY}_${category}`;
  if (!forceRefresh) {
    const cached = loadFromCache(scoredCacheKey);
    if (cached) return cached;
  }

  // 2. Récupérer les données météo brutes (cachées 6h, partagées entre catégories)
  const weather = await fetchRawWeather(forceRefresh, onProgress);

  // 3. Scorer les points pour cette catégorie (instantané, pas de réseau)
  const points = scorePoints(weather, category);

  // 4. Cacher les points scorés (sauf si des données simulées s'y trouvent)
  if (!points.some(p => p.simulated)) {
    saveToCache(points, scoredCacheKey);
  }
  return points;
}

// --- Cache localStorage ---

function loadFromCache(key: string = CACHE_KEY): HeatmapPointData[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached: CachedHeatmapData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.points;
  } catch {
    return null;
  }
}

function saveToCache(points: HeatmapPointData[], key: string = CACHE_KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      points,
    } satisfies CachedHeatmapData));
  } catch {
    // ignore
  }
}

// --- Click-anywhere: explore n'importe quel point ---

interface WFSFeature {
  properties: {
    essence?: string;
    tfv?: string;
  };
}

/**
 * Query IGN BD Forêt V2 WFS for a single point.
 * Returns essences and forest name, or null if no forest.
 */
async function queryWFSForPoint(lat: number, lon: number): Promise<{
  essences: string[];
  name: string;
} | null> {
  const R = 0.005; // ~550m radius
  const bbox = `${lon - R},${lat - R},${lon + R},${lat + R},EPSG:4326`;
  const url = `${WFS_BASE}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature`
    + `&TYPENAME=LANDCOVER.FORESTINVENTORY.V2:formation_vegetale`
    + `&OUTPUTFORMAT=application/json`
    + `&SRSNAME=EPSG:4326`
    + `&PROPERTYNAME=essence,tfv`
    + `&BBOX=${bbox}`
    + `&COUNT=50`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;

    const data = await resp.json();
    const features: WFSFeature[] = data.features || [];
    if (features.length === 0) return null;

    // Count essences from forest features only
    const essenceCount: Record<string, number> = {};
    let forestCount = 0;

    for (const f of features) {
      const e = f.properties?.essence || '';
      const tfv = f.properties?.tfv || '';

      // Only count forest features
      if (!tfv.toLowerCase().includes('forêt') && !tfv.toLowerCase().includes('peupleraie')) continue;
      forestCount++;

      if (e && e !== 'NR' && e !== 'NC') {
        essenceCount[e] = (essenceCount[e] || 0) + 1;
      }
    }

    if (forestCount === 0) return null;

    // Map to internal essences
    const internalEssences = new Set<string>();
    for (const ignE of Object.keys(essenceCount)) {
      for (const mapped of mapIgnEssence(ignE)) {
        internalEssences.add(mapped);
      }
    }

    const essences = [...internalEssences];

    // Build name from top essences
    let name: string;
    if (essences.length > 0) {
      name = essences.length <= 2 ? essences.join(' / ') : 'Forêt';
    } else {
      // Infer from generic IGN categories
      const keys = Object.keys(essenceCount);
      const hasConifer = keys.some(k =>
        ['Conifères', 'Pins mélangés'].includes(k) || k.startsWith('Pin') || k.startsWith('Epic') || k.startsWith('Sapin') || k === 'Douglas' || k === 'Mélèze'
      );
      const hasDeciduous = keys.some(k =>
        ['Feuillus', 'Mixte'].includes(k) || ['Hêtre', 'Châtaignier', 'Charme', 'Frêne', 'Bouleau'].includes(k) || k.startsWith('Chêne')
      );
      if (hasConifer && hasDeciduous) name = 'Forêt mixte';
      else if (hasConifer) name = 'Forêt de conifères';
      else if (hasDeciduous) name = 'Forêt de feuillus';
      else name = 'Forêt';
    }

    name = name.charAt(0).toUpperCase() + name.slice(1);

    return { essences, name };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fetch weather + compute score for a single point (click-anywhere).
 * Queries IGN WFS for essences and Open-Meteo for weather.
 */
export async function fetchSinglePointData(
  lat: number,
  lon: number
): Promise<HeatmapPointData | null> {
  // Query WFS and weather in parallel
  const [wfsResult, weatherResp] = await Promise.all([
    queryWFSForPoint(lat, lon),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
      + `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration`
      + `&past_days=14&forecast_days=1&timezone=Europe%2FParis`
    ),
  ]);

  if (!wfsResult) return null; // No forest at this point

  let score = 0;
  let stats: HeatmapStats = {
    rain14d: 0, rain3d: 0, tempMean7d: 0, tempDrop: 0,
    wetDays7: 0, amplitude: 0, et0_7d: 0, soilBalance: 0,
  };

  if (weatherResp.ok) {
    const weatherData = await weatherResp.json();
    if (weatherData?.daily) {
      const result = computeMushroomProbability(weatherData.daily);
      score = result.score;
      stats = result.stats;
    }
  }

  return {
    id: -1, // temporary ID for explored point
    lat,
    lon,
    name: wfsResult.name,
    region: '📍 Point exploré',
    score,
    stats,
    essences: wfsResult.essences,
  };
}
