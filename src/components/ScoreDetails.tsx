// ============================================================
// ChampIndex — Facteurs météo (grille de cartes métriques)
// ============================================================

import type { WeatherScoreDetail } from '../types';

interface ScoreDetailsProps {
  details: WeatherScoreDetail[];
}

const impactColors: Record<string, { badge: string; bar: string }> = {
  '++': { badge: 'bg-moss-wash text-moss', bar: 'bg-moss' },
  '+': { badge: 'bg-moss-wash text-moss', bar: 'bg-moss' },
  '~': { badge: 'bg-paper-deep text-ink-faint', bar: 'bg-moss' },
  '-': { badge: 'bg-danger-wash text-danger', bar: 'bg-danger' },
  '--': { badge: 'bg-danger-wash text-danger', bar: 'bg-danger' },
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
      <h3 className="text-[11px] font-semibold text-ink-faint uppercase tracking-[0.18em] mb-3 px-1">
        Facteurs météo
      </h3>

      {/* Grille 2 colonnes de cartes métriques */}
      <div className="grid grid-cols-2 gap-3">
        {gridDetails.map((detail) => {
          const colors = impactColors[detail.impact] || impactColors['~'];
          return (
            <div
              key={detail.factor}
              className="bg-paper-raised p-3 rounded-xl border border-line"
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-xs text-ink-soft truncate">{detail.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${colors.badge}`}
                >
                  {detail.impact}
                </span>
              </div>
              <div className="font-display text-lg font-semibold text-ink mb-2">{detail.value}</div>
              <div
                className="w-full bg-paper-deep h-1.5 rounded-full overflow-hidden"
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
          <div className="col-span-2 bg-paper-raised p-3 rounded-xl border border-line flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs text-ink-soft block">{seasonDetail.label}</span>
              <span className="font-display text-lg font-semibold text-ink">{seasonDetail.value}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded ${seasonColors.badge}`}
              >
                {seasonDetail.impact} Impact
              </span>
              <div
                className="w-20 bg-paper-deep h-1.5 rounded-full overflow-hidden"
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
