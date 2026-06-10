// ============================================================
// ChampIndex — Bandeau d'alertes météo déclenchantes
// ============================================================

import { useMemo, useState } from 'react';
import { matchAlerts, getSeasonalAlerts } from '../lib/alert-engine';
import type { HeatmapStats } from '../lib/heatmap-api';
import type { WeatherAlert } from '../lib/weather-alerts-db';

// ── Couleurs par fiabilité ──

const RELIABILITY_STYLES: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  high: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Fiable' },
  medium: { bg: 'bg-amber-900/30', border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'Probable' },
  low: { bg: 'bg-white/5', border: 'border-white/10', dot: 'bg-white/40', label: 'Possible' },
};

// ── Carte d'alerte individuelle ──

function AlertCard({ alert, relevance }: { alert: WeatherAlert; relevance?: number }) {
  const style = RELIABILITY_STYLES[alert.reliability];
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`flex-shrink-0 w-[260px] rounded-xl ${style.bg} border ${style.border}
        p-3 text-left transition-all snap-start`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-semibold text-white/90 truncate">{alert.targetSpecies}</span>
        {relevance !== undefined && relevance >= 70 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
            {relevance}%
          </span>
        )}
      </div>

      {/* Message */}
      <p className="text-[11px] text-white/70 leading-relaxed">{alert.appMessage}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
          <p className="text-[10px] text-white/50">
            📍 {alert.whereToLook}
          </p>
          <p className="text-[10px] text-white/40">
            📅 {alert.period}
          </p>
          <p className="text-[10px] text-white/40 italic">
            {alert.condition}
          </p>
          <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full ${style.bg} ${style.border} border text-white/50`}>
            {style.label}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Bandeau scrollable — alimenté par stats météo réelles ──

interface AlertBannerProps {
  stats: HeatmapStats;
}

export function AlertBanner({ stats }: AlertBannerProps) {
  const activeAlerts = useMemo(() => matchAlerts(stats), [stats]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="px-4 py-3">
      {/* Le titre de section « Alertes espèces » est fourni par Layout */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4">
        {activeAlerts.map(({ alert, relevance }) => (
          <AlertCard key={alert.id} alert={alert} relevance={relevance} />
        ))}
      </div>
    </div>
  );
}

// ── Bandeau saisonnier — pour l'accueil (sans stats météo) ──

export function SeasonalAlertBanner() {
  const alerts = useMemo(() => getSeasonalAlerts(), []);

  if (alerts.length === 0) return null;

  return (
    <div className="w-full max-w-sm">
      <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">
        🔔 À surveiller ce mois-ci
      </p>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mr-4 pr-4">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
