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
import { IconMushroom, IconPlant, IconBerry, IconAlert } from './Icons';

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
    <div className="absolute bottom-6 left-3 z-[1000] bg-paper-raised/95 backdrop-blur-md border border-line rounded-xl px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-ink mb-1.5">{labels[category]}</p>
      {[
        { color: '#ef4444', label: 'Très probable' },
        { color: '#f59e0b', label: 'Moyen' },
        { color: '#3b82f6', label: 'Peu probable' },
      ].map(l => (
        <div key={l.label} className="flex items-center gap-2 py-0.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: l.color }} />
          <span className="text-ink-soft">{l.label}</span>
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
function LocationSheet({
  location,
  category,
  nearestPoint,
  onClose,
}: {
  location: ForagingLocation;
  category: ForagingCategory;
  nearestPoint: HeatmapPointData | null;
  onClose: () => void;
}) {
  const speciesContent = category === 'mushroom' ? location.mainMushrooms : category === 'plant' ? location.mainPlants : location.mainBerries;
  const speciesLabel = category === 'mushroom' ? 'Champignons' : category === 'plant' ? 'Plantes' : 'Baies & fruits';
  const SpeciesIcon = category === 'mushroom' ? IconMushroom : category === 'plant' ? IconPlant : IconBerry;
  const conditions = nearestPoint ? getPointColor(nearestPoint.score) : null;
  const soil = nearestPoint ? Math.round(nearestPoint.stats.soilBalance) : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-paper-raised border-t border-line rounded-t-3xl shadow-[0_-10px_40px_rgba(42,42,36,0.18)] px-6 pt-2 pb-8 animate-slide-up max-h-[60vh] overflow-y-auto">
      <div className="w-12 h-1 bg-line-strong rounded-full mx-auto mb-5" />

      {/* En-tête : nom + badge score */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-2xl font-bold text-ink leading-tight">{location.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="bg-paper-deep text-ink-faint text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-[0.18em]">
              {location.department}
            </span>
            <span className="text-ink-soft text-xs italic">{location.habitatType}</span>
          </div>
          {location.areaHectares && (
            <p className="flex items-center gap-1 text-[11px] text-ink-soft mt-1.5">
              <span className="material-symbols-outlined text-sm text-moss leading-none">square_foot</span>
              {location.areaHectares.toLocaleString('fr-FR')} ha
            </p>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {nearestPoint && (
            <div className="bg-terra-wash border border-terra/40 rounded-2xl w-14 h-14 flex items-center justify-center">
              <span className="font-display text-2xl font-bold text-terra">{nearestPoint.score}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-paper-deep flex items-center justify-center text-ink-soft hover:text-ink transition-colors"
            aria-label="Fermer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Cartes métriques météo (point heatmap le plus proche) */}
      {nearestPoint && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-paper-deep p-3 rounded-2xl text-center">
              <div className="text-[10px] text-ink-faint uppercase tracking-[0.18em] mb-1">Pluie</div>
              <div className="font-display text-lg font-bold text-ink">
                {Math.round(nearestPoint.stats.rain14d)}
                <span className="text-xs font-semibold text-ink-faint">mm</span>
              </div>
            </div>
            <div className="bg-paper-deep p-3 rounded-2xl text-center">
              <div className="text-[10px] text-ink-faint uppercase tracking-[0.18em] mb-1">Temp</div>
              <div className="font-display text-lg font-bold text-ink">
                {Math.round(nearestPoint.stats.tempMean7d)}
                <span className="text-xs font-semibold text-ink-faint">°C</span>
              </div>
            </div>
            <div className="bg-paper-deep p-3 rounded-2xl text-center">
              <div className="text-[10px] text-ink-faint uppercase tracking-[0.18em] mb-1">Sol</div>
              <div className="font-display text-lg font-bold text-ink">
                {soil >= 0 ? `+${soil}` : soil}
                <span className="text-xs font-semibold text-ink-faint">mm</span>
              </div>
            </div>
          </div>
          {conditions && (
            <div className="flex items-center gap-2 mb-5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: conditions.color }}
              />
              <span className="text-[10px] text-ink-soft font-medium uppercase tracking-[0.18em]">
                Conditions météo : {conditions.label}
              </span>
            </div>
          )}
        </>
      )}

      {/* Espèces */}
      {speciesContent && (
        <div className="bg-paper-deep rounded-2xl p-4 mb-3">
          <p className="flex items-center gap-1.5 text-[10px] text-ink-faint uppercase tracking-[0.18em] mb-1.5">
            <SpeciesIcon size={14} className="text-moss" />
            {speciesLabel}
          </p>
          <p className="text-sm text-ink-soft leading-relaxed">{speciesContent}</p>
        </div>
      )}

      {/* Meilleure période */}
      {location.bestPeriod && (
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-base text-moss">calendar_month</span>
          <p className="text-xs text-ink-soft font-medium">{location.bestPeriod}</p>
        </div>
      )}

      {/* Notes */}
      {location.notes && (
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-base text-moss mt-0.5">sticky_note_2</span>
          <p className="text-xs text-ink-soft leading-relaxed">{location.notes}</p>
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

  // Point heatmap le plus proche du lieu sélectionné (stats météo réelles).
  // Au-delà de ~0.4° de distance, on n'affiche rien plutôt que d'inventer.
  const nearestPoint = useMemo(() => {
    if (!selectedLocation) return null;
    let best: HeatmapPointData | null = null;
    let bestD = Infinity;
    for (const p of points) {
      const d = (p.lat - selectedLocation.lat) ** 2 + (p.lon - selectedLocation.lng) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best && bestD <= 0.16 ? best : null;
  }, [selectedLocation, points]);

  // --- Loading ---
  if (loading && points.length === 0) {
    return (
      <div className="heatmap-view min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-line border-t-moss animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center">
            <IconMushroom size={28} className="text-moss" />
          </span>
        </div>
        <p className="text-sm text-ink-soft animate-pulse">Chargement de la carte...</p>
        {progress ? (
          <div className="w-48 mt-2">
            <div className="flex justify-between text-[10px] text-ink-faint mb-1">
              <span>{progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} zones</span>
              <span>{Math.round(progress.loaded / progress.total * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-paper-deep rounded-full overflow-hidden">
              <div className="h-full bg-moss rounded-full transition-all duration-300"
                style={{ width: `${(progress.loaded / progress.total) * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-faint">France · Météo en temps réel</p>
        )}
      </div>
    );
  }

  // --- Error ---
  if (error && points.length === 0) {
    return (
      <div className="heatmap-view min-h-screen flex flex-col items-center justify-center gap-4 px-8">
        <IconAlert size={48} className="text-danger" />
        <p className="text-sm text-danger text-center">{error}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-paper-raised border border-line-strong text-ink text-sm hover:bg-paper-deep transition-colors">
            Retour
          </button>
          <button onClick={() => refresh(true)}
            className="px-6 py-2.5 rounded-xl bg-moss text-paper text-sm font-medium hover:bg-moss-deep transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // --- Carte ---
  return (
    <div className="heatmap-view relative w-screen h-screen overflow-hidden">
      {/* Contrôles haut gauche : Retour, rafraîchir, toggle spots */}
      <div className="absolute top-4 left-3 z-[1000] flex flex-col items-start gap-2">
        <button onClick={onBack}
          className="h-11 pl-3 pr-4 rounded-full bg-paper-raised/95 backdrop-blur-md border border-line
            flex items-center gap-2 text-sm font-medium text-ink shadow-lg hover:bg-paper-deep transition-colors"
          aria-label="Retour">
          <span className="material-symbols-outlined text-xl text-ink-soft">arrow_back</span>
          Retour
        </button>
        <button onClick={() => refresh(true)} disabled={loading}
          className="w-11 h-11 rounded-full bg-paper-raised/95 backdrop-blur-md border border-line
            flex items-center justify-center text-ink-soft shadow-lg hover:text-ink transition-colors disabled:opacity-50"
          aria-label="Rafraîchir">
          <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>
            {loading ? 'progress_activity' : 'refresh'}
          </span>
        </button>
        <button
          onClick={() => setShowSpots(v => !v)}
          className={`h-11 px-4 rounded-full backdrop-blur-md shadow-lg border flex items-center gap-2
            text-xs font-bold uppercase tracking-wider transition-colors ${
            showSpots
              ? 'bg-moss text-paper border-moss'
              : 'bg-paper-raised/95 text-ink-soft border-line'
          }`}
          aria-label={showSpots ? 'Masquer les lieux' : 'Afficher les lieux'}>
          <span className={`w-2 h-2 rounded-full ${showSpots ? 'bg-paper animate-pulse' : 'bg-line-strong'}`} />
          {showSpots ? 'Spots ON' : 'Spots OFF'}
        </button>
      </div>

      {/* Badge stats haut droite */}
      <div className="absolute top-4 right-3 z-[1000]">
        <div className="bg-paper-raised/95 backdrop-blur-md px-4 py-2 rounded-xl border border-line shadow-lg text-right">
          <div className="text-[10px] uppercase text-ink-faint font-bold tracking-[0.18em]">Carte de France</div>
          <div className="font-display text-lg font-bold text-ink leading-tight">
            {points.length.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-ink-faint">forêts</span>
          </div>
        </div>
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
        <div className="absolute top-44 left-3 right-3 z-[1000] bg-terra-wash border border-terra/40 backdrop-blur-md rounded-xl px-3 py-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-terra font-medium">
            <span className="material-symbols-outlined text-base leading-none">warning</span>
            Météo temps réel indisponible — scores estimés. Réessayez dans une minute.
          </p>
        </div>
      )}

      {/* Légende */}
      <Legend category={selectedCategory} />

      {/* Bottom sheet lieu */}
      {selectedLocation && (
        <LocationSheet
          location={selectedLocation}
          category={selectedCategory}
          nearestPoint={nearestPoint}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
}
