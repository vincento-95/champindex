// ============================================================
// ChampIndex — Facteurs météo (grille de cartes métriques)
// ============================================================

import type { WeatherScoreDetail } from '../types';

interface ScoreDetailsProps {
  details: WeatherScoreDetail[];
}

const impactColors: Record<string, { bg: string; text: string; bar: string }> = {
  '++': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-400' },
  '+': { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-400' },
  '~': { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-400' },
  '-': { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-400' },
  '--': { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-400' },
};

function barWidth(detail: WeatherScoreDetail): string {
  if (detail.maxScore <= 0) return '0%';
  const pct = Math.max(0, Math.min(100, (detail.score / detail.maxScore) * 100));
  return `${Math.round(pct)}%`;
}

export default function ScoreDetails({ details }: ScoreDetailsProps) {
  // La saisonnalité passe en carte pleine largeur sous la grille
  const seasonDetail = details.find((d) => d.factor === 'season');
  const gridDetails = details.filter((d) => d.factor !== 'season');
  const seasonColors = seasonDetail
    ? impactColors[seasonDetail.impact] || impactColors['~']
    : impactColors['~'];

  return (
    <section className="px-4 mt-4">
      <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-3 px-1">
        Facteurs Météo
      </h3>

      {/* Grille 2 colonnes de cartes métriques */}
      <div className="grid grid-cols-2 gap-3">
        {gridDetails.map((detail) => {
          const colors = impactColors[detail.impact] || impactColors['~'];
          return (
            <div
              key={detail.factor}
              className="bg-[#2d3828]/40 p-3 rounded-xl border border-white/5"
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-xs text-white/50 truncate">{detail.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {detail.impact}
                </span>
              </div>
              <div className="text-lg font-bold text-white mb-2">{detail.value}</div>
              <div
                className="w-full bg-[#2d3828]/60 h-1.5 rounded-full overflow-hidden"
                role="img"
                aria-label={`${detail.score} sur ${detail.maxScore} points`}
              >
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: barWidth(detail) }}
                />
              </div>
              <span className="sr-only">
                {detail.score}/{detail.maxScore} pts
              </span>
            </div>
          );
        })}

        {/* Saisonnalité — carte pleine largeur */}
        {seasonDetail && (
          <div className="col-span-2 bg-[#2d3828]/40 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs text-white/50 block">{seasonDetail.label}</span>
              <span className="text-lg font-bold text-white">{seasonDetail.value}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded ${seasonColors.bg} ${seasonColors.text}`}
              >
                {seasonDetail.impact} Impact
              </span>
              <div
                className="w-20 bg-[#2d3828]/60 h-1.5 rounded-full overflow-hidden"
                role="img"
                aria-label={`${seasonDetail.score} sur ${seasonDetail.maxScore} points`}
              >
                <div
                  className={`h-full rounded-full ${seasonColors.bar}`}
                  style={{ width: barWidth(seasonDetail) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
