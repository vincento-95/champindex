// ============================================================
// ChampIndex — Hook géolocalisation
// ============================================================

import { useState, useCallback } from 'react';
import type { Coordinates } from '../types';

interface GeolocationState {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: false,
    error: null,
  });

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'La géolocalisation n\'est pas supportée par votre navigateur.' }));
      return;
    }

    setState({ coordinates: null, loading: true, error: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          loading: false,
          error: null,
        });
      },
      (err) => {
        let message = 'Impossible d\'obtenir votre position.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Accès à la position refusé. Sélectionnez un spot manuellement.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Position indisponible. Vérifiez votre GPS.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Délai d\'attente dépassé. Réessayez.';
        }
        setState({ coordinates: null, loading: false, error: message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache 5 min
      }
    );
  }, []);

  return { ...state, requestPosition };
}
