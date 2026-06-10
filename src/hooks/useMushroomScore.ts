// ============================================================
// ChampIndex — Hook principal d'orchestration du score
// ============================================================

import { useState, useCallback } from 'react';
import type { MushroomScore, Coordinates, ForecastDay, WeatherData, ForagingCategory } from '../types';
import { computeWeatherScoreForCategory, getScoreLevel, SCORE_LEVELS_BY_CATEGORY } from '../lib/foraging-scoring';
import { clamp } from '../lib/scoring';
import { computeTerrainScore } from '../lib/terrain';
import { getSpeciesForConditions } from '../lib/species-db';
import { fetchFullWeatherData, fetchElevationData, reverseGeocode } from '../lib/api';
import { computeTerrainData } from '../lib/terrain';

interface ScoreState {
  score: MushroomScore | null;
  forecast: ForecastDay[];
  loading: boolean;
  error: string | null;
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * Calcule les prévisions 7 jours avec score estimé pour chaque jour
 */
function computeForecast(weather: WeatherData, terrainBonus: number, category: ForagingCategory): ForecastDay[] {
  const daily = weather.daily;
  const today = new Date().toISOString().split('T')[0];
  const days: ForecastDay[] = [];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Prendre les 7 derniers jours de données (qui sont les prévisions)
  const startIdx = Math.max(0, daily.time.length - 7);

  for (let i = startIdx; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T12:00:00');
    const isToday = daily.time[i] === today;

    // Estimation simplifiée du score pour ce jour
    // On utilise les données disponibles jusqu'à ce jour
    const endIdx = i + 1;
    const rain14 = daily.precipitation_sum.slice(Math.max(0, endIdx - 14), endIdx);
    const rain3 = daily.precipitation_sum.slice(Math.max(0, endIdx - 3), endIdx);
    const temps7 = daily.temperature_2m_mean.slice(Math.max(0, endIdx - 7), endIdx);

    // Score simplifié pour la prévision
    const totalRain14 = rain14.reduce((a, b) => a + b, 0);
    const totalRain3 = rain3.reduce((a, b) => a + b, 0);
    const avgTemp = mean(temps7);
    const month = date.getMonth() + 1;

    let dayScore = 0;

    if (category === 'mushroom') {
      if (totalRain14 >= 40 && totalRain14 <= 80) dayScore += 30;
      else if (totalRain14 >= 25) dayScore += 22;
      else if (totalRain14 >= 10) dayScore += 10;
      else dayScore += 2;
      if (totalRain3 >= 10 && totalRain3 <= 30) dayScore += 20;
      else if (totalRain3 >= 5) dayScore += 14;
      else dayScore += 3;
      const idealRange: [number, number] = (month >= 9 || month <= 2) ? [8, 18] : [14, 22];
      if (avgTemp >= idealRange[0] && avgTemp <= idealRange[1]) dayScore += 25;
      else if (avgTemp >= idealRange[0] - 4) dayScore += 16;
      else dayScore += 8;
      dayScore += [9, 10, 11].includes(month) ? 10 : month >= 4 && month <= 8 ? 6 : 2;
      dayScore += 10;
    } else if (category === 'plant') {
      // Température large
      const idealMin = month >= 3 && month <= 5 ? 8 : month >= 6 && month <= 8 ? 15 : 5;
      const idealMax = month >= 3 && month <= 5 ? 22 : month >= 6 && month <= 8 ? 32 : 18;
      if (avgTemp >= idealMin && avgTemp <= idealMax) dayScore += 30;
      else if (avgTemp >= idealMin - 4) dayScore += 18;
      else dayScore += 5;
      // Saison plantes : printemps pic
      dayScore += [3, 4, 5, 6].includes(month) ? 25 : [7, 8, 9, 10].includes(month) ? 15 : 5;
      // Humidité + ensoleillement + stabilité estimés
      if (totalRain14 >= 15 && totalRain14 <= 60) dayScore += 20;
      else if (totalRain14 >= 5) dayScore += 12;
      else dayScore += 4;
      dayScore += 15; // sun + stability estimated
    } else {
      // Baies
      const gdd = temps7.reduce((a, t) => a + Math.max(0, t - 5), 0) * 2; // proxy 14d
      if (gdd >= 120) dayScore += 25;
      else if (gdd >= 80) dayScore += 18;
      else dayScore += 8;
      dayScore += [7, 8, 9].includes(month) ? 25 : [6, 10, 11].includes(month) ? 15 : 3;
      // Maturation : peu de pluie récente + chaleur
      if (totalRain3 < 5 && avgTemp >= 15) dayScore += 20;
      else if (totalRain3 < 10) dayScore += 12;
      else dayScore += 5;
      // Temp + humidité estimés
      if (avgTemp >= 15 && avgTemp <= 28) dayScore += 15;
      else dayScore += 8;
      dayScore += 10;
    }

    const finalScore = clamp(dayScore + terrainBonus, 0, 100);
    const level = getScoreLevel(finalScore);

    days.push({
      date: daily.time[i],
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      score: finalScore,
      level,
      tempMin: daily.temperature_2m_min[i],
      tempMax: daily.temperature_2m_max[i],
      precipitation: daily.precipitation_sum[i],
      precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
      isToday,
    });
  }

  return days;
}

export function useMushroomScore() {
  const [state, setState] = useState<ScoreState>({
    score: null,
    forecast: [],
    loading: false,
    error: null,
  });

  const calculateScore = useCallback(async (coords: Coordinates, locationName?: string, category: ForagingCategory = 'mushroom') => {
    setState({ score: null, forecast: [], loading: true, error: null });

    try {
      // Lancer les requêtes en parallèle
      const [weather, elevationGrid, location] = await Promise.all([
        fetchFullWeatherData(coords.lat, coords.lon),
        fetchElevationData(coords.lat, coords.lon).catch(() => null),
        locationName
          ? Promise.resolve(locationName)
          : reverseGeocode(coords.lat, coords.lon),
      ]);

      // Score météo (adapté à la catégorie)
      const weatherScore = computeWeatherScoreForCategory(weather, category);

      // Score terrain (optionnel)
      let terrainScore = null;
      let terrainData = null;
      if (elevationGrid) {
        terrainData = computeTerrainData(elevationGrid);
        terrainScore = computeTerrainScore(terrainData);
      }

      // Score final
      const terrainBonus = terrainScore?.total ?? 0;
      const total = clamp(weatherScore.total + terrainBonus, 0, 100);
      const level = getScoreLevel(total);
      const levelInfo = SCORE_LEVELS_BY_CATEGORY[category][level];

      // Espèces filtrées
      const month = new Date().getMonth() + 1;
      const avgTemp = mean(weather.daily.temperature_2m_mean.slice(-7));
      const altitude = terrainData?.altitude ?? 300;
      const species = getSpeciesForConditions(month, avgTemp, altitude);

      // Prévisions 7 jours
      const forecast = computeForecast(weather, terrainBonus, category);

      const score: MushroomScore = {
        total,
        level,
        levelInfo,
        weather: weatherScore,
        terrain: terrainScore,
        species,
        location,
        coordinates: coords,
        date: new Date().toISOString().split('T')[0],
      };

      setState({ score, forecast, loading: false, error: null });
      return { score, forecast };
    } catch {
      setState({
        score: null,
        forecast: [],
        loading: false,
        error: 'Erreur lors du calcul du score. Vérifiez votre connexion.',
      });
      return null;
    }
  }, []);

  return { ...state, calculateScore };
}
