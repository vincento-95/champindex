// ============================================================
// ChampIndex — Prévision 7 jours (bandeau scrollable)
// ============================================================

import type { ForecastDay } from '../types';
import { SCORE_LEVELS } from '../lib/scoring';

interface ForecastStripProps {
  days: ForecastDay[];
}

export default function ForecastStrip({ days }: ForecastStripProps) {
  if (days.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-ink-faint">
        Chargement des prévisions...
      </div>
    );
  }

  // Trouver le max de précipitation pour le mini-graphique
  const maxPrecip = Math.max(...days.map(d => d.precipitation), 1);

  return (
    <div className="px-4 py-4">
      {/* Bandeau scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
        {days.map((day) => {
          const levelInfo = SCORE_LEVELS[day.level];
          return (
            <div
              key={day.date}
              className={`flex-shrink-0 w-[88px] p-3 rounded-2xl text-center transition-all
                ${day.isToday
                  ? 'bg-moss-wash border-2 border-moss'
                  : 'bg-paper-raised border border-line'
                }`}
            >
              <p className={`text-xs font-semibold ${day.isToday ? 'text-moss' : 'text-ink-faint'}`}>
                {day.isToday ? "Auj." : day.dayName}
              </p>
              <p className="font-display text-lg font-semibold text-ink">{day.dayNumber}</p>

              {/* Badge score */}
              <div
                className="w-11 h-11 mx-auto my-2 rounded-full flex items-center justify-center text-sm font-bold bg-paper-raised"
                style={{
                  color: levelInfo.color,
                  border: `2px solid ${levelInfo.color}`,
                }}
              >
                {day.score}
              </div>

              {/* Temp + pluie */}
              <p className="text-xs text-ink-soft">
                {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
              </p>
              {day.precipitation > 0 && (
                <p className="text-xs text-moss mt-0.5 flex items-center justify-center gap-0.5">
                  <span className="material-symbols-outlined !text-[12px] leading-none" aria-hidden="true">
                    water_drop
                  </span>
                  {day.precipitation.toFixed(1)}mm
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini graphique précipitations */}
      <div className="mt-4 p-4 rounded-2xl bg-paper-raised border border-line">
        <p className="text-[11px] text-ink-faint uppercase tracking-[0.18em] font-semibold mb-3">Précipitations</p>
        <div className="flex items-end gap-1 h-16">
          {days.map((day) => {
            const height = Math.max(2, (day.precipitation / maxPrecip) * 100);
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-all duration-500
                    ${day.precipitation > 5 ? 'bg-moss' : day.precipitation > 0 ? 'bg-moss/50' : 'bg-paper-deep'}`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-ink-faint">{day.dayName.charAt(0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conseil prévision */}
      <div className="mt-3 p-3 rounded-xl bg-moss-wash">
        <p className="text-xs text-ink leading-relaxed flex gap-2">
          <span className="material-symbols-outlined !text-sm text-moss flex-shrink-0 leading-none mt-0.5" aria-hidden="true">
            lightbulb
          </span>
          <span>{getBestDayAdvice(days)}</span>
        </p>
      </div>
    </div>
  );
}

function getBestDayAdvice(days: ForecastDay[]): string {
  const best = days.reduce((a, b) => a.score > b.score ? a : b);
  const bestIdx = days.findIndex(d => d.date === best.date);

  if (best.isToday) {
    return "Aujourd'hui est le meilleur jour de la semaine pour sortir. Profitez-en !";
  }
  if (bestIdx <= 1) {
    return `Demain sera le meilleur jour cette semaine (score ${best.score}). Préparez votre panier !`;
  }
  return `Le meilleur jour sera ${best.dayName} (score ${best.score}). Patience, les conditions s'améliorent.`;
}
