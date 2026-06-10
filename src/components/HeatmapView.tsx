// ============================================================
// ChampIndex — Carte de France (satellite Google + points colorés)
// ============================================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useHeatmapData } from '../hooks/useHeatmapData';
import type { HeatmapPointData } from '../lib/heatmap-api';
import { FORAGING_LOCATIONS, type ForagingLocation } from '../lib/locations-db';
import type { ForagingCategory } from '../types';

// --- Constantes ---

const FRANCE_CENTER: [number, number] = [46.6, 2.5];
const DEFAULT_ZOOM = 6;
const SPOT_ZOOM_THRESHOLD = 8;

// 3 couleurs uniquement
function getPointColor(score: number): { color: string; label: string } {
  if (score >= 55) return { color: '#ef4444', label: 'Très probable' };   // Rouge
  if (score >= 30) return { color: '#f59e0b', label: 'Moyen' };           // Orange
  return { color: '#3b82f6', label: 'Peu probable' };                      // Bleu
}

// --- Sous-composants ---

/** Points colorés (3 niveaux) */
function ScorePoints({ points }: { points: HeatmapPointData[] }) {
  return (
    <>
      {points.map(p => {
        const { color } = getPointColor(p.score);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={6}
            pathOptions={{
              color: 'transparent',
              fillColor: color,
              fillOpacity: 0.7,
              // Transparents aux taps : sinon ils interceptent le clic et
              // MapClickToLocation (sélection du lieu le plus proche) ne
              // se déclenche jamais quand on tape pile sur un point.
              interactive: false,
            }}
          />
        );
      })}
    </>
  );
}

/** Clic → trouve le vrai lieu le plus proche */
function MapClickToLocation({
  onSelectLocation,
  category,
}: {
  onSelectLocation: (loc: ForagingLocation) => void;
  category: ForagingCategory;
}) {
  const map = useMap();
  const filtered = useMemo(
    () => filterLocationsByCategory(FORAGING_LOCATIONS, category),
    [category],
  );

  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent?.target as HTMLElement;
      if (target?.closest('.leaflet-interactive')) return;

      const { lat, lng: lon } = e.latlng;
      let nearest: ForagingLocation | null = null;
      let minDist = Infinity;

      for (const loc of filtered) {
        const d = (loc.lat - lat) ** 2 + (loc.lng - lon) ** 2;
        if (d < minDist) { minDist = d; nearest = loc; }
      }

      if (nearest && minDist < 0.25) {
        onSelectLocation(nearest);
      }
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [map, filtered, onSelectLocation]);

  return null;
}

/** Légende 3 couleurs */
function Legend({ category }: { category: ForagingCategory }) {
  const labels: Record<ForagingCategory, string> = {
    mushroom: 'Probabilité champignons',
    plant: 'Conditions plantes',
    berry: 'Maturité baies',
  };

  return (
    <div className="absolute bottom-6 left-3 z-[1000] bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-white/90 mb-1.5">{labels[category]}</p>
      {[
        { color: '#ef4444', label: 'Très probable' },
        { color: '#f59e0b', label: 'Moyen' },
        { color: '#3b82f6', label: 'Peu probable' },
      ].map(l => (
        <div key={l.label} className="flex items-center gap-2 py-0.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: l.color }} />
          <span className="text-white/70">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Lieux de foraging ---

function getLocationEmoji(habitatType: string): string {
  const h = habitatType.toLowerCase();
  if (h.includes('estran') || h.includes('littoral') || h.includes('algue') || h.includes('salin')) return '🌊';
  if (h.includes('marais') || h.includes('zone humide') || h.includes('tourbière') || h.includes('vasière')) return '💧';
  if (h.includes('prairie') || h.includes('pelouse') || h.includes('alpage') || h.includes('prés salés')) return '🌾';
  if (h.includes('dune')) return '🌊';
  if (h.includes('garrigue') || h.includes('maquis')) return '☀️';
  return '🌲';
}

function makeEmojiIcon(emoji: string) {
  return L.divIcon({
    html: `<span style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.8))">${emoji}</span>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function filterLocationsByCategory(locations: ForagingLocation[], category: ForagingCategory): ForagingLocation[] {
  return locations.filter(loc => {
    if (category === 'mushroom') return loc.mainMushrooms && !loc.mainMushrooms.toLowerCase().includes('aucun');
    if (category === 'plant') return loc.mainPlants && loc.mainPlants.length > 0;
    return loc.mainBerries && loc.mainBerries.length > 0;
  });
}

/** Contours IGN précis d'un lieu (chargé à la demande) */
function ForestZonePolygons({
  locationId,
  category,
}: {
  locationId: string;
  category: ForagingCategory;
}) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}zones/${locationId}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setGeoData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locationId]);

  if (!geoData) return null;

  const zoneColor: Record<ForagingCategory, string> = {
    mushroom: '#22c55e',
    plant: '#3b82f6',
    berry: '#a855f7',
  };

  return (
    <GeoJSON
      key={locationId + category}
      data={geoData}
      style={{
        color: zoneColor[category],
        weight: 1.5,
        fillColor: zoneColor[category],
        fillOpacity: 0.15,
        dashArray: '4 3',
      }}
    />
  );
}

function LocationMarkers({ category, onSelect }: { category: ForagingCategory; onSelect: (loc: ForagingLocation) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  const filtered = useMemo(() => filterLocationsByCategory(FORAGING_LOCATIONS, category), [category]);

  if (zoom < SPOT_ZOOM_THRESHOLD) return null;

  return (
    <>
      {filtered.map(loc => {
        if (!loc.lat || !loc.lng) return null;
        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={makeEmojiIcon(getLocationEmoji(loc.habitatType))}
            eventHandlers={{ click: () => onSelect(loc) }}
          />
        );
      })}
    </>
  );
}

/** Bottom sheet lieu */
function LocationSheet({ location, category, onClose }: { location: ForagingLocation; category: ForagingCategory; onClose: () => void }) {
  const emoji = getLocationEmoji(location.habitatType);
  const speciesContent = category === 'mushroom' ? location.mainMushrooms : category === 'plant' ? location.mainPlants : location.mainBerries;
  const speciesLabel = category === 'mushroom' ? '🍄 Champignons' : category === 'plant' ? '🌿 Plantes' : '🫐 Baies & fruits';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#1a2215]/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl px-5 py-4 animate-slide-up max-h-[60vh] overflow-y-auto">
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <h3 className="text-lg font-semibold text-white">{location.name}</h3>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{location.department}</p>
          <p className="text-[11px] text-white/50 mt-1">{location.habitatType}</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none">&times;</button>
      </div>
      {location.areaHectares && (
        <p className="text-[11px] text-emerald-400/60 mt-2">📐 {location.areaHectares.toLocaleString('fr-FR')} ha</p>
      )}
      {speciesContent && (
        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">{speciesLabel}</p>
          <p className="text-xs text-white/80 leading-relaxed">{speciesContent}</p>
        </div>
      )}
      {location.bestPeriod && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs">📅</span>
          <p className="text-xs text-amber-300/80">{location.bestPeriod}</p>
        </div>
      )}
      {location.notes && (
        <div className="mt-2 flex items-start gap-2">
          <span className="text-xs mt-0.5">📋</span>
          <p className="text-xs text-white/50 leading-relaxed">{location.notes}</p>
        </div>
      )}
    </div>
  );
}

// --- Composant principal ---

interface HeatmapViewProps {
  onBack: () => void;
  selectedCategory: ForagingCategory;
}

export default function HeatmapView({ onBack, selectedCategory }: HeatmapViewProps) {
  const { points, loading, error, progress, refresh } = useHeatmapData(selectedCategory);
  const [showSpots, setShowSpots] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<ForagingLocation | null>(null);

  // Météo réelle indisponible (rate-limit, hors-ligne) → scores estimés
  const hasSimulatedData = points.some(p => p.simulated);

  const handleSelectLocation = useCallback((loc: ForagingLocation) => {
    setSelectedLocation(loc);
  }, []);

  // --- Loading ---
  if (loading && points.length === 0) {
    return (
      <div className="heatmap-view min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-emerald-400 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl">🌡️</span>
        </div>
        <p className="text-sm text-white/50 animate-pulse">Chargement de la carte...</p>
        {progress ? (
          <div className="w-48 mt-2">
            <div className="flex justify-between text-[10px] text-white/40 mb-1">
              <span>{progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} zones</span>
              <span>{Math.round(progress.loaded / progress.total * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.loaded / progress.total) * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/30">France · Météo en temps réel</p>
        )}
      </div>
    );
  }

  // --- Error ---
  if (error && points.length === 0) {
    return (
      <div className="heatmap-view min-h-screen flex flex-col items-center justify-center gap-4 px-8">
        <span className="text-5xl">😕</span>
        <p className="text-sm text-red-300 text-center">{error}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onBack}
            className="px-6 py-2 rounded-xl bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors">
            ← Retour
          </button>
          <button onClick={() => refresh(true)}
            className="px-6 py-2 rounded-xl bg-emerald-700 text-white text-sm hover:bg-emerald-600 transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // --- Carte ---
  return (
    <div className="heatmap-view relative w-screen h-screen overflow-hidden">
      {/* Bouton retour */}
      <button onClick={onBack}
        className="absolute top-4 left-3 z-[1000] bg-black/50 backdrop-blur-md text-white
          w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70 shadow-lg"
        aria-label="Retour">
        <span className="material-symbols-outlined text-xl">arrow_back</span>
      </button>

      {/* Boutons droite */}
      <div className="absolute top-4 right-3 z-[1000] flex gap-2">
        <button
          onClick={() => setShowSpots(v => !v)}
          className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-colors ${
            showSpots ? 'bg-emerald-600/80 text-white' : 'bg-black/50 text-white/60 hover:bg-black/70'
          }`}
          aria-label={showSpots ? 'Masquer les lieux' : 'Afficher les lieux'}>
          <span className="material-symbols-outlined text-xl">location_on</span>
        </button>
        <button onClick={() => refresh(true)} disabled={loading}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-md text-white/60 hover:bg-black/70 shadow-lg disabled:opacity-50"
          aria-label="Rafraîchir">
          <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>
            {loading ? 'progress_activity' : 'refresh'}
          </span>
        </button>
      </div>

      {/* Carte Leaflet — tuiles satellite Google */}
      <MapContainer
        center={FRANCE_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas
        aria-label="Carte de France satellite">
        {/* Esri World Imagery — utilisable sans clé (contrairement aux
            tuiles internes Google, hors conditions d'utilisation) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
          maxZoom={19}
        />

        {/* Points colorés 3 niveaux (données météo) */}
        {points.length > 0 && <ScorePoints points={points} />}

        {/* Contours IGN précis du lieu sélectionné */}
        {selectedLocation && (
          <ForestZonePolygons locationId={selectedLocation.id} category={selectedCategory} />
        )}

        {/* Marqueurs emoji lieux (zoom ≥ 8) */}
        {showSpots && <LocationMarkers category={selectedCategory} onSelect={handleSelectLocation} />}

        {/* Clic → vrai lieu le plus proche */}
        <MapClickToLocation onSelectLocation={handleSelectLocation} category={selectedCategory} />
      </MapContainer>

      {/* Bandeau données simulées */}
      {hasSimulatedData && (
        <div className="absolute top-16 left-3 right-3 z-[1000] bg-amber-900/90 backdrop-blur-md rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-amber-200 font-medium">
            ⚠️ Météo temps réel indisponible — scores estimés. Réessayez dans une minute.
          </p>
        </div>
      )}

      {/* Légende */}
      <Legend category={selectedCategory} />

      {/* Bottom sheet lieu */}
      {selectedLocation && (
        <LocationSheet location={selectedLocation} category={selectedCategory} onClose={() => setSelectedLocation(null)} />
      )}
    </div>
  );
}
