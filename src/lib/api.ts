// ============================================================
// ChampIndex — Wrappers API (Open-Meteo, Open-Elevation, Nominatim)
// ============================================================

import type { WeatherData, ElevationGrid } from '../types';
import { getElevationGrid } from './terrain';

// --- Rate limiter pour Nominatim (1 req/s) ---
let lastNominatimCall = 0;
async function nominatimThrottle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1100) {
    await new Promise(r => setTimeout(r, 1100 - elapsed));
  }
  lastNominatimCall = Date.now();
}

// --- Fetch avec retry et timeout ---
async function fetchWithRetry(url: string, retries = 2, timeout = 10000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      if (attempt === retries) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================
// OPEN-METEO — Météo historique (16 derniers jours)
// ============================================================
export async function fetchHistoricalWeather(lat: number, lon: number): Promise<WeatherData> {
  const today = new Date();
  // Archive API a ~5 jours de délai, on prend J-16 à J-5
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 5);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 16);

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
    timezone: 'Europe/Paris',
  });

  const res = await fetchWithRetry(`https://archive-api.open-meteo.com/v1/archive?${params}`);
  return res.json();
}

// ============================================================
// OPEN-METEO — Prévisions (7 jours)
// ============================================================
export async function fetchForecast(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,precipitation_probability_max',
    timezone: 'Europe/Paris',
    forecast_days: '7',
    past_days: '5', // Complète les 5 jours manquants de l'archive
  });

  const res = await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?${params}`);
  return res.json();
}

// ============================================================
// Fusion archive + prévisions
// ============================================================
export async function fetchFullWeatherData(lat: number, lon: number): Promise<WeatherData> {
  try {
    const [historical, forecast] = await Promise.all([
      fetchHistoricalWeather(lat, lon).catch(() => null),
      fetchForecast(lat, lon),
    ]);

    if (!historical) {
      // Mode dégradé : seulement les prévisions (past_days=5 couvre une partie)
      return forecast;
    }

    // Fusionner : archive (J-16 à J-5) + forecast (J-5 à J+7)
    // On déduplique par date
    const dateMap = new Map<string, number>();
    const merged: WeatherData = {
      latitude: forecast.latitude,
      longitude: forecast.longitude,
      daily: {
        time: [],
        temperature_2m_max: [],
        temperature_2m_min: [],
        temperature_2m_mean: [],
        precipitation_sum: [],
        precipitation_probability_max: [],
      },
    };

    // D'abord l'archive
    for (let i = 0; i < historical.daily.time.length; i++) {
      const date = historical.daily.time[i];
      if (!dateMap.has(date)) {
        dateMap.set(date, merged.daily.time.length);
        merged.daily.time.push(date);
        merged.daily.temperature_2m_max.push(historical.daily.temperature_2m_max[i]);
        merged.daily.temperature_2m_min.push(historical.daily.temperature_2m_min[i]);
        merged.daily.temperature_2m_mean.push(historical.daily.temperature_2m_mean[i]);
        merged.daily.precipitation_sum.push(historical.daily.precipitation_sum[i]);
        merged.daily.precipitation_probability_max!.push(0);
      }
    }

    // Puis les prévisions (écrasent si doublon)
    for (let i = 0; i < forecast.daily.time.length; i++) {
      const date = forecast.daily.time[i];
      if (dateMap.has(date)) {
        const idx = dateMap.get(date)!;
        merged.daily.temperature_2m_max[idx] = forecast.daily.temperature_2m_max[i];
        merged.daily.temperature_2m_min[idx] = forecast.daily.temperature_2m_min[i];
        merged.daily.temperature_2m_mean[idx] = forecast.daily.temperature_2m_mean[i];
        merged.daily.precipitation_sum[idx] = forecast.daily.precipitation_sum[i];
        merged.daily.precipitation_probability_max![idx] = forecast.daily.precipitation_probability_max?.[i] ?? 0;
      } else {
        dateMap.set(date, merged.daily.time.length);
        merged.daily.time.push(date);
        merged.daily.temperature_2m_max.push(forecast.daily.temperature_2m_max[i]);
        merged.daily.temperature_2m_min.push(forecast.daily.temperature_2m_min[i]);
        merged.daily.temperature_2m_mean.push(forecast.daily.temperature_2m_mean[i]);
        merged.daily.precipitation_sum.push(forecast.daily.precipitation_sum[i]);
        merged.daily.precipitation_probability_max!.push(forecast.daily.precipitation_probability_max?.[i] ?? 0);
      }
    }

    return merged;
  } catch {
    // Fallback total sur les prévisions seules
    return fetchForecast(lat, lon);
  }
}

// ============================================================
// OPEN-ELEVATION — Grille d'élévation 3×3
// ============================================================
export async function fetchElevationData(lat: number, lon: number): Promise<ElevationGrid> {
  const gridPoints = getElevationGrid(lat, lon, 50);
  const locations = gridPoints.map(p => `${p.lat},${p.lon}`).join('|');

  try {
    const res = await fetchWithRetry(
      `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`,
      2,
      15000
    );
    const data = await res.json();
    const results = data.results as { latitude: number; longitude: number; elevation: number }[];

    return {
      points: results.map(r => ({
        lat: r.latitude,
        lon: r.longitude,
        elevation: r.elevation,
      })),
      centerElevation: results[4].elevation, // Point central (index 4 dans la grille 3×3)
    };
  } catch {
    // Fallback : IGN France
    try {
      const res = await fetchWithRetry(
        `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=${lon}&lat=${lat}`,
        1,
        10000
      );
      const data = await res.json();
      const elev = data.elevations?.[0]?.z ?? 200;

      // Retourner une grille plate (pas de calcul de pente possible, mais altitude OK)
      return {
        points: gridPoints.map(p => ({ ...p, elevation: elev })),
        centerElevation: elev,
      };
    } catch {
      // Fallback complet : altitude par défaut
      return {
        points: gridPoints.map(p => ({ ...p, elevation: 200 })),
        centerElevation: 200,
      };
    }
  }
}

// ============================================================
// NOMINATIM — Reverse geocoding
// ============================================================
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  await nominatimThrottle();

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      'accept-language': 'fr',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'ChampIndex/1.0' },
    });
    const data = await res.json();

    return data.address?.forest
      || data.address?.natural
      || data.address?.village
      || data.address?.town
      || data.address?.city
      || data.display_name?.split(',')[0]
      || 'Lieu inconnu';
  } catch {
    return 'Lieu inconnu';
  }
}

// ============================================================
// NOMINATIM — Recherche de lieu
// ============================================================
export async function searchLocation(query: string): Promise<{ lat: number; lon: number; name: string }[]> {
  await nominatimThrottle();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      'accept-language': 'fr',
      countrycodes: 'fr',
      limit: '5',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'ChampIndex/1.0' },
    });
    const data = await res.json();

    return data.map((r: { lat: string; lon: string; display_name: string }) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      name: r.display_name.split(',').slice(0, 2).join(','),
    }));
  } catch {
    return [];
  }
}

// --- Utilitaires ---
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
