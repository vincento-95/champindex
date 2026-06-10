// ============================================================
// ChampIndex — Hook pour les données de heatmap
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { HeatmapPointData } from '../lib/heatmap-api';
import { fetchBatchHeatmapData } from '../lib/heatmap-api';
import type { ForagingCategory } from '../types';

interface UseHeatmapDataReturn {
  points: HeatmapPointData[];
  loading: boolean;
  error: string | null;
  progress: { loaded: number; total: number } | null;
  refresh: (forceRefresh?: boolean) => void;
}

export function useHeatmapData(category: ForagingCategory = 'mushroom'): UseHeatmapDataReturn {
  const [points, setPoints] = useState<HeatmapPointData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      const data = await fetchBatchHeatmapData(
        forceRefresh,
        category,
        (loaded, total) => setProgress({ loaded, total }),
      );
      setPoints(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Impossible de charger les données météo : ${message}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [category]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const refresh = useCallback((forceRefresh = true) => {
    loadData(forceRefresh);
  }, [loadData]);

  return { points, loading, error, progress, refresh };
}
