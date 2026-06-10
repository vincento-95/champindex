// ============================================================
// ChampIndex — Hook élévation (Open-Elevation / IGN)
// ============================================================

import { useState, useCallback } from 'react';
import type { ElevationGrid, TerrainData } from '../types';
import { fetchElevationData } from '../lib/api';
import { computeTerrainData } from '../lib/terrain';

interface ElevationState {
  grid: ElevationGrid | null;
  terrain: TerrainData | null;
  loading: boolean;
  error: string | null;
}

export function useElevation() {
  const [state, setState] = useState<ElevationState>({
    grid: null,
    terrain: null,
    loading: false,
    error: null,
  });

  const fetchElevation = useCallback(async (lat: number, lon: number) => {
    setState({ grid: null, terrain: null, loading: true, error: null });
    try {
      const grid = await fetchElevationData(lat, lon);
      const terrain = computeTerrainData(grid);
      setState({ grid, terrain, loading: false, error: null });
      return { grid, terrain };
    } catch {
      setState({ grid: null, terrain: null, loading: false, error: 'Données d\'élévation indisponibles.' });
      return null;
    }
  }, []);

  return { ...state, fetchElevation };
}
