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
      <div className="px-4 py-8 text-center text-white/40">
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
                  ? 'bg-white/10 border-2 backdrop-blur-md'
                  : 'bg-white/5 border border-white/5 backdrop-blur-sm'
                }`}
              style={day.isToday ? { borderColor: levelInfo.color } : undefined}
            >
              <p className={`text-xs font-semibold ${day.isToday ? 'text-amber-400' : 'text-white/50'}`}>
                {day.isToday ? "Auj." : day.dayName}
              </p>
              <p className="text-lg font-bold text-white/90">{day.dayNumber}</p>

              {/* Badge score */}
              <div
                className="w-11 h-11 mx-auto my-2 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{
                  backgroundColor: `${levelInfo.color}30`,
                  border: `2px solid ${levelInfo.color}`,
                }}
              >
                {day.score}
              </div>

              {/* Temp + pluie */}
              <p className="text-xs text-white/60">
                {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
              </p>
              {day.precipitation > 0 && (
                <p className="text-xs text-blue-300 mt-0.5">
                  💧 {day.precipitation.toFixed(1)}mm
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini graphique précipitations */}
      <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Précipitations</p>
        <div className="flex items-end gap-1 h-16">
          {days.map((day) => {
            const height = Math.max(2, (day.precipitation / maxPrecip) * 100);
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${height}%`,
                    backgroundColor: day.precipitation > 5 ? '#60a5fa' : day.precipitation > 0 ? '#60a5fa60' : '#ffffff10',
                  }}
                />
                <span className="text-[10px] text-white/30">{day.dayName.charAt(0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conseil prévision */}
      <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
        <p className="text-xs text-white/60 leading-relaxed">
          <span className="text-amber-400">💡</span>{' '}
          {getBestDayAdvice(days)}
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
