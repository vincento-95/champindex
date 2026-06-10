// ============================================================
// ChampIndex — Hook météo (Open-Meteo)
// ============================================================

import { useState, useCallback } from 'react';
import type { WeatherData } from '../types';
import { fetchFullWeatherData } from '../lib/api';

interface WeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fetchFullWeatherData(lat, lon);
      setState({ data, loading: false, error: null });
      return data;
    } catch {
      setState({ data: null, loading: false, error: 'Impossible de charger les données météo.' });
      return null;
    }
  }, []);

  return { ...state, fetchWeather };
}
