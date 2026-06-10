// ============================================================
// ChampIndex — Bandeau d'alertes météo déclenchantes
// ============================================================

import { useMemo, useState } from 'react';
import { matchAlerts, getSeasonalAlerts } from '../lib/alert-engine';
import type { HeatmapStats } from '../lib/heatmap-api';
import type { WeatherAlert } from '../lib/weather-alerts-db';

// ── Pastilles par fiabilité ──

const RELIABILITY_STYLES: Record<string, { dot: string; pill: string; label: string }> = {
  high: { dot: 'bg-moss', pill: 'bg-moss-wash text-moss', label: 'Fiable' },
  medium: { dot: 'bg-terra', pill: 'bg-terra-wash text-terra', label: 'Probable' },
  low: { dot: 'bg-line-strong', pill: 'bg-paper-deep text-ink-faint', label: 'Possible' },
};

// ── Carte d'alerte individuelle ──

function AlertCard({ alert, relevance }: { alert: WeatherAlert; relevance?: number }) {
  const style = RELIABILITY_STYLES[alert.reliability];
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="flex-shrink-0 w-[260px] rounded-xl bg-paper-raised border border-line
        p-3 text-left transition-all snap-start"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
        <span className="text-xs font-semibold text-ink truncate">{alert.targetSpecies}</span>
        {relevance !== undefined && relevance >= 70 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-moss-wash text-moss font-medium">
            {relevance}%
          </span>
        )}
      </div>

      {/* Message */}
      <p className="text-[11px] text-ink-soft leading-relaxed">{alert.appMessage}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-line space-y-1">
          <p className="text-[10px] text-ink-soft flex items-center gap-1">
            <span className="material-symbols-outlined !text-[12px] leading-none text-ink-faint" aria-hidden="true">
              location_on
            </span>
            {alert.whereToLook}
          </p>
          <p className="text-[10px] text-ink-faint flex items-center gap-1">
            <span className="material-symbols-outlined !text-[12px] leading-none" aria-hidden="true">
              calendar_month
            </span>
            {alert.period}
          </p>
          <p className="text-[10px] text-ink-faint italic">
            {alert.condition}
          </p>
          <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style.pill}`}>
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
      <p className="text-[10px] text-ink-faint uppercase tracking-[0.18em] font-medium mb-2">
        À surveiller ce mois-ci
      </p>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mr-4 pr-4">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
