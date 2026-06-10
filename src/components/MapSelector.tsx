// ============================================================
// ChampIndex — Carte Leaflet interactive (Écran 6)
// ============================================================

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Spot } from '../types';
import { searchLocation } from '../lib/api';

// Fix Leaflet default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error - fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapSelectorProps {
  onSelectLocation: (spot: Spot) => void;
  onBack: () => void;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapSelector({ onSelectLocation, onBack }: MapSelectorProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ lat: number; lon: number; name: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setSelectedPoint({ lat, lon });
    setSearchResults([]);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchLocation(searchQuery);
    setSearchResults(results);
    setSearching(false);
  }, [searchQuery]);

  const handleAnalyze = useCallback(() => {
    if (selectedPoint) {
      onSelectLocation({
        name: '',
        lat: selectedPoint.lat,
        lon: selectedPoint.lon,
        region: '',
      });
    }
  }, [selectedPoint, onSelectLocation]);

  return (
    <div className="h-screen flex flex-col relative">
      {/* Barre de recherche flottante */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#1a2215]/90 backdrop-blur-md border border-white/10
              flex items-center justify-center text-white/80 hover:bg-white/10 transition-all"
          >
            ←
          </button>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="🔍 Rechercher une forêt..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a2215]/90 backdrop-blur-md border border-white/10
                text-white/90 text-sm placeholder-white/30
                focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 rounded-xl bg-emerald-700/90 backdrop-blur-md text-white text-sm font-medium
                hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              {searching ? '...' : 'OK'}
            </button>
          </div>
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-xl bg-[#1a2215]/95 backdrop-blur-md border border-white/10 overflow-hidden">
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedPoint({ lat: result.lat, lon: result.lon });
                  setSearchResults([]);
                  setSearchQuery(result.name);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                📍 {result.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carte Leaflet */}
      <div className="flex-1">
        <MapContainer
          center={[46.6, 2.5]}
          zoom={6}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <MapClickHandler onClick={handleMapClick} />
          {selectedPoint && (
            <Marker position={[selectedPoint.lat, selectedPoint.lon]} />
          )}
        </MapContainer>
      </div>

      {/* Bottom sheet */}
      {selectedPoint && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-t from-[#1a2215] via-[#1a2215]/95 to-transparent pt-12">
          <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-white/90 font-medium">Point sélectionné</p>
                <p className="text-xs text-white/40">
                  {selectedPoint.lat.toFixed(4)}°N, {selectedPoint.lon.toFixed(4)}°E
                </p>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-white/40 hover:text-white/70 text-xl"
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              className="w-full py-3 rounded-xl font-semibold text-white
                bg-gradient-to-r from-emerald-700 to-emerald-600
                hover:from-emerald-600 hover:to-emerald-500
                active:scale-[0.98] transition-all duration-200"
            >
              🍄 Analyser ce spot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
