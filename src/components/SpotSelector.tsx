// ============================================================
// ChampIndex — Écran d'accueil (DA « guide naturaliste »)
// ============================================================

import { useMemo, useState } from 'react';
import type { Spot, ForagingCategory } from '../types';
import type { WeatherAlert } from '../lib/weather-alerts-db';
import { SPOTS } from '../lib/species-db';
import { getSeasonalAlerts } from '../lib/alert-engine';
import NotificationSettings from './NotificationSettings';
import { IconMushroom, IconPlant, IconBerry, IconLogo, IconForest } from './Icons';

const CATEGORIES: { id: ForagingCategory; Icon: React.FC<{size?: number; className?: string}>; label: string }[] = [
  { id: 'mushroom', Icon: IconMushroom, label: 'Champignons' },
  { id: 'plant', Icon: IconPlant, label: 'Plantes' },
  { id: 'berry', Icon: IconBerry, label: 'Baies' },
];

// ── Cartes saisonnières « À surveiller ce mois-ci » ──

const RELIABILITY_STYLES: Record<WeatherAlert['reliability'], { chip: string; label: string }> = {
  high: { chip: 'bg-moss-wash text-moss', label: 'Fiable' },
  medium: { chip: 'bg-paper-deep text-ink-soft', label: 'Probable' },
  low: { chip: 'bg-paper-deep text-ink-faint', label: 'Possible' },
};

function SeasonalCard({ alert }: { alert: WeatherAlert }) {
  const [expanded, setExpanded] = useState(false);
  const style = RELIABILITY_STYLES[alert.reliability];

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="flex-shrink-0 w-[240px] rounded-2xl bg-paper-raised border border-line
        p-3.5 text-left snap-start transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Pastille icône à gauche */}
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-moss-wash text-moss flex items-center justify-center">
          <IconMushroom size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink leading-tight truncate">{alert.targetSpecies}</p>
          <p className="text-[11px] text-ink-soft leading-snug mt-1">{alert.appMessage}</p>
        </div>
      </div>

      {/* Détails au tap */}
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-line space-y-1">
          <p className="text-[10px] text-ink-soft flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">location_on</span>
            {alert.whereToLook}
          </p>
          <p className="text-[10px] text-ink-faint flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">calendar_month</span>
            {alert.period}
          </p>
          <p className="text-[10px] text-ink-faint italic">{alert.condition}</p>
          <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style.chip}`}>
            {style.label}
          </span>
        </div>
      )}
    </button>
  );
}

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
      <header className="flex flex-col items-center gap-2 mb-8 mt-6">
        <div className="flex items-center gap-3">
          <IconLogo size={44} className="text-moss" />
          <h1 className="text-3xl font-bold font-display text-ink">
            ChampIndex
          </h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          L'indice de cueillette
        </p>
      </header>

      {/* Toggle catégorie — rounded-full pills */}
      <nav className="flex w-full max-w-sm bg-paper-deep p-1.5 rounded-full mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChangeCategory(cat.id)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95
              flex items-center justify-center gap-1.5 ${
              selectedCategory === cat.id ? 'bg-moss text-paper' : 'text-ink-soft hover:text-ink'
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
          className="w-full py-4 px-6 rounded-2xl font-semibold text-paper
            bg-moss hover:bg-moss-deep
            flex items-center justify-center gap-3
            active:scale-95 transition-all
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
          <p className="text-xs text-danger text-center">{geoError}</p>
        )}

        {/* CTA Identification photo — accent terre cuite */}
        {onOpenIdentify && (
          <button
            onClick={onOpenIdentify}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-paper
              bg-terra hover:opacity-90
              flex items-center justify-center gap-3
              active:scale-95 transition-all"
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
              bg-paper-raised border border-line
              hover:border-line-strong active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1 text-moss">map</span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-soft">Carte</span>
          </button>
          <button
            onClick={() => onOpenHabitats?.()}
            className="min-h-[60px] flex flex-col items-center justify-center py-3 rounded-2xl
              bg-paper-raised border border-line
              hover:border-line-strong active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1 text-moss">forest</span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-soft">Habitats</span>
          </button>
          <button
            onClick={() => onOpenNotebook?.()}
            className="min-h-[60px] flex flex-col items-center justify-center py-3 rounded-2xl
              bg-paper-raised border border-line
              hover:border-line-strong active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1 text-moss">menu_book</span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-soft">Carnet</span>
          </button>
        </div>
      </section>

      {/* Alertes saisonnières */}
      {seasonalAlerts.length > 0 && (
        <section className="w-full max-w-sm mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint px-1 mb-3">
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
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint px-1 mb-3">
          Spots forestiers
        </h2>
        <div className="grid grid-cols-2 gap-3.5">
          {SPOTS.map((spot, i) => (
            <button
              key={spot.name}
              onClick={() => onSelectSpot(spot)}
              className="stagger-child press-scale p-4 rounded-2xl bg-paper-raised border border-line
                hover:border-line-strong text-left flex items-start gap-3 transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <IconForest size={18} className="text-moss flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold font-display text-ink leading-tight">{spot.name.replace('Forêt de ', '').replace('Forêt des ', '').replace('Massif des ', '')}</p>
                <p className="text-[10px] text-moss mt-1 uppercase font-medium tracking-wide">{spot.region}</p>
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
      <footer className="w-full max-w-sm mt-10 mb-4 pt-6 border-t border-line text-center space-y-1.5">
        <p className="text-[10px] text-ink-faint uppercase tracking-[0.2em] font-medium">
          © ChampIndex — Cueillez avec responsabilité
        </p>
        <p className="text-[10px] text-ink-faint uppercase tracking-[0.15em]">
          Données : Open-Meteo · IGN · OpenStreetMap
        </p>
      </footer>
    </div>
  );
}
