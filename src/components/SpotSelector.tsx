// ============================================================
// ChampIndex — Écran d'accueil (design inspiré Stitch)
// ============================================================

import { useMemo, useState } from 'react';
import type { Spot, ForagingCategory } from '../types';
import type { WeatherAlert } from '../lib/weather-alerts-db';
import { SPOTS } from '../lib/species-db';
import { getSeasonalAlerts } from '../lib/alert-engine';
import NotificationSettings from './NotificationSettings';
import { IconMushroom, IconPlant, IconBerry, IconLogo } from './Icons';

const CATEGORIES: { id: ForagingCategory; Icon: React.FC<{size?: number; className?: string}>; label: string; activeClass: string; hoverClass: string }[] = [
  { id: 'mushroom', Icon: IconMushroom, label: 'Champignons', activeClass: 'bg-emerald-600 text-white shadow-lg', hoverClass: 'hover:bg-emerald-900/20 text-emerald-300' },
  { id: 'plant', Icon: IconPlant, label: 'Plantes', activeClass: 'bg-blue-600 text-white shadow-lg', hoverClass: 'hover:bg-blue-900/20 text-blue-300' },
  { id: 'berry', Icon: IconBerry, label: 'Baies', activeClass: 'bg-purple-600 text-white shadow-lg', hoverClass: 'hover:bg-purple-900/20 text-purple-300' },
];

// ── Cartes saisonnières « À surveiller ce mois-ci » ──

const RELIABILITY_STYLES: Record<WeatherAlert['reliability'], { bg: string; border: string; chip: string; label: string }> = {
  high: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/30', chip: 'bg-emerald-500/15 text-emerald-300', label: 'Fiable' },
  medium: { bg: 'bg-amber-900/30', border: 'border-amber-500/25', chip: 'bg-amber-500/15 text-amber-300', label: 'Probable' },
  low: { bg: 'bg-white/5', border: 'border-white/10', chip: 'bg-white/10 text-white/50', label: 'Possible' },
};

function SeasonalCard({ alert }: { alert: WeatherAlert }) {
  const [expanded, setExpanded] = useState(false);
  const style = RELIABILITY_STYLES[alert.reliability];

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`flex-shrink-0 w-[240px] rounded-2xl ${style.bg} border ${style.border}
        p-3.5 text-left snap-start transition-all active:scale-[0.98]`}
    >
      <div className="flex items-start gap-3">
        {/* Pastille icône à gauche */}
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-black/25 border border-white/10 flex items-center justify-center text-base">
          🍄
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-50 leading-tight truncate">{alert.targetSpecies}</p>
          <p className="text-[11px] text-white/65 leading-snug mt-1">{alert.appMessage}</p>
        </div>
      </div>

      {/* Détails au tap */}
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-1">
          <p className="text-[10px] text-white/50">📍 {alert.whereToLook}</p>
          <p className="text-[10px] text-white/40">📅 {alert.period}</p>
          <p className="text-[10px] text-white/40 italic">{alert.condition}</p>
          <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style.chip}`}>
            {style.label}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Icônes alternées des spots (comme la maquette) ──

const TREE_ICONS = ['🌲', '🌳', '🌲', '🌿'];

interface SpotSelectorProps {
  onSelectSpot: (spot: Spot) => void;
  onUsePosition: () => void;
  onOpenHeatmap: () => void;
  onOpenHabitats?: () => void;
  onOpenNotebook?: () => void;
  onOpenIdentify?: () => void;
  geoLoading: boolean;
  geoError: string | null;
  selectedCategory: ForagingCategory;
  onChangeCategory: (cat: ForagingCategory) => void;
}

export default function SpotSelector({
  onSelectSpot,
  onUsePosition,
  onOpenHeatmap,
  onOpenHabitats,
  onOpenNotebook,
  onOpenIdentify,
  geoLoading,
  geoError,
  selectedCategory,
  onChangeCategory,
}: SpotSelectorProps) {
  const seasonalAlerts = useMemo(() => getSeasonalAlerts(), []);

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8 animate-fade-in">
      {/* Logo & titre */}
      <header className="flex items-center gap-3 mb-8 mt-6">
        <IconLogo size={44} className="text-amber-400" />
        <h1
          className="text-3xl font-bold bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-transparent"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          ChampIndex
        </h1>
      </header>

      {/* Toggle catégorie — rounded-full pills (Stitch) */}
      <nav className="flex w-full max-w-sm bg-black/30 p-1.5 rounded-full mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChangeCategory(cat.id)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95
              flex items-center justify-center gap-1.5 ${
              selectedCategory === cat.id ? cat.activeClass : cat.hoverClass
            }`}
          >
            <cat.Icon size={16} />
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Actions principales */}
      <section className="w-full max-w-sm space-y-3">
        {/* CTA Géolocalisation */}
        <button
          onClick={onUsePosition}
          disabled={geoLoading}
          className="w-full py-4 px-6 rounded-2xl font-bold text-white
            bg-gradient-to-r from-emerald-600 to-green-700
            flex items-center justify-center gap-3
            shadow-lg active:scale-95 transition-transform
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {geoLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Localisation en cours...
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">my_location</span>
              Utiliser ma position
            </>
          )}
        </button>

        {geoError && (
          <p className="text-xs text-red-400 text-center">{geoError}</p>
        )}

        {/* CTA Identification photo — ambre/orange (Stitch) */}
        {onOpenIdentify && (
          <button
            onClick={onOpenIdentify}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white
              bg-gradient-to-r from-amber-600 to-orange-700
              flex items-center justify-center gap-3
              shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg">photo_camera</span>
            Identifier une espèce (photo)
          </button>
        )}

        {/* Rangée de 3 boutons compacts : Carte · Habitats · Carnet */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onOpenHeatmap}
            className="min-h-[60px] flex flex-col items-center justify-center py-3 rounded-2xl
              text-white bg-[#2a3524] border border-[#3e5235]
              hover:bg-[#3e5235] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1">map</span>
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Carte</span>
          </button>
          <button
            onClick={() => onOpenHabitats?.()}
            className="min-h-[60px] flex flex-col items-center justify-center py-3 rounded-2xl
              text-white bg-[#2a3524] border border-[#3e5235]
              hover:bg-[#3e5235] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1">forest</span>
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Habitats</span>
          </button>
          <button
            onClick={() => onOpenNotebook?.()}
            className="min-h-[60px] flex flex-col items-center justify-center py-3 rounded-2xl
              text-white bg-[#2a3524] border border-[#3e5235]
              hover:bg-[#3e5235] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1">menu_book</span>
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Carnet</span>
          </button>
        </div>
      </section>

      {/* Alertes saisonnières */}
      {seasonalAlerts.length > 0 && (
        <section className="w-full max-w-sm mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500/80 px-1 mb-3">
            À surveiller ce mois-ci
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-5 px-5">
            {seasonalAlerts.map((alert) => (
              <SeasonalCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {/* Spots forestiers */}
      <section className="w-full max-w-sm mt-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500/80 px-1 mb-3">
          Spots forestiers
        </h2>
        <div className="grid grid-cols-2 gap-3.5">
          {SPOTS.map((spot, i) => (
            <button
              key={spot.name}
              onClick={() => onSelectSpot(spot)}
              className="stagger-child press-scale p-4 rounded-2xl bg-[#2a3524]/60 border border-white/5
                hover:bg-[#2a3524] hover:border-white/10 text-left flex items-start gap-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="text-lg">{TREE_ICONS[i % TREE_ICONS.length]}</span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{spot.name.replace('Forêt de ', '').replace('Forêt des ', '').replace('Massif des ', '')}</p>
                <p className="text-[10px] text-emerald-500 mt-1 uppercase font-medium tracking-wide">{spot.region}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="w-full max-w-sm mt-8">
        <NotificationSettings />
      </section>

      {/* Footer */}
      <footer className="w-full max-w-sm mt-10 mb-4 pt-6 border-t border-emerald-900/30 text-center space-y-1.5">
        <p className="text-[10px] text-emerald-100/30 uppercase tracking-[0.2em] font-medium">
          © ChampIndex — Cueillez avec responsabilité
        </p>
        <p className="text-[10px] text-white/20 uppercase tracking-[0.15em]">
          Données : Open-Meteo · IGN · OpenStreetMap
        </p>
      </footer>
    </div>
  );
}
