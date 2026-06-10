// ============================================================
// ChampIndex — Écran d'accueil (design inspiré Stitch)
// ============================================================

import type { Spot, ForagingCategory } from '../types';
import { SPOTS } from '../lib/species-db';
import { SeasonalAlertBanner } from './AlertBanner';
import NotificationSettings from './NotificationSettings';
import { IconMushroom, IconPlant, IconBerry, IconLogo } from './Icons';

const CATEGORIES: { id: ForagingCategory; Icon: React.FC<{size?: number; className?: string}>; label: string; activeClass: string; hoverClass: string }[] = [
  { id: 'mushroom', Icon: IconMushroom, label: 'Champignons', activeClass: 'bg-emerald-600 text-white shadow-lg', hoverClass: 'hover:bg-emerald-900/20 text-emerald-300' },
  { id: 'plant', Icon: IconPlant, label: 'Plantes', activeClass: 'bg-blue-600 text-white shadow-lg', hoverClass: 'hover:bg-blue-900/20 text-blue-300' },
  { id: 'berry', Icon: IconBerry, label: 'Baies', activeClass: 'bg-purple-600 text-white shadow-lg', hoverClass: 'hover:bg-purple-900/20 text-purple-300' },
];

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
  geoLoading,
  geoError,
  selectedCategory,
  onChangeCategory,
}: SpotSelectorProps) {
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

        {/* Bouton carte */}
        <button
          onClick={onOpenHeatmap}
          className="w-full py-3.5 px-6 rounded-2xl font-semibold text-white text-sm
            bg-[#2a3524] border border-[#3e5235]
            hover:bg-[#3e5235] active:scale-95 transition-all
            flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">map</span>
          Carte de France en temps réel
        </button>
      </section>

      {/* Alertes saisonnières */}
      <section className="w-full max-w-sm mt-8">
        <SeasonalAlertBanner />
      </section>

      {/* Spots forestiers */}
      <section className="w-full max-w-sm mt-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500/80 px-1 mb-3">
          Spots forestiers
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SPOTS.map((spot, i) => (
            <button
              key={spot.name}
              onClick={() => onSelectSpot(spot)}
              className="stagger-child press-scale p-4 rounded-2xl bg-white/[0.04] border border-white/5
                hover:bg-white/[0.08] hover:border-white/10 text-left flex items-start gap-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="text-lg">🌲</span>
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
      <footer className="mt-8 mb-4 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.15em]">
          Données : Open-Meteo · IGN · OpenStreetMap
        </p>
      </footer>
    </div>
  );
}
