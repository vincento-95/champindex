// ============================================================
// ChampIndex — Jauge circulaire SVG (anneau de progression)
// ============================================================

import type { ScoreLevelInfo } from '../types';

interface ScoreGaugeProps {
  score: number;
  levelInfo: ScoreLevelInfo;
  terrainBonus?: number;
}

// Cercle r=45 dans un viewBox 100×100 → circonférence 2πr
const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 282.74

// Pill de niveau : mapping des couleurs lib → tokens papier
// (exceptionnel → terre cuite, favorable → mousse, moyen → neutre, défavorable → danger)
const PILL_BY_COLOR: Record<string, string> = {
  '#2d6a4f': 'bg-terra-wash text-terra',
  '#40916c': 'bg-moss-wash text-moss',
  '#6a994e': 'bg-moss-wash text-moss',
  '#bc6c25': 'bg-paper-deep text-ink-soft',
  '#ae2012': 'bg-danger-wash text-danger',
  '#9b2226': 'bg-danger-wash text-danger',
};

export default function ScoreGauge({ score, levelInfo, terrainBonus }: ScoreGaugeProps) {
  // Accessibilité : annonce du score
  const ariaLabel = `Score de ${score} sur 100. Niveau : ${levelInfo.label}`;

  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

  const pillClass = PILL_BY_COLOR[levelInfo.color] ?? 'bg-moss-wash text-moss';

  return (
    <div className="flex flex-col items-center justify-center pt-6 pb-2" role="status" aria-label={ariaLabel}>
      {/* Anneau de progression */}
      <div className="relative size-48 flex items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          {/* Cercle de fond */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            stroke="#ddd6c2"
            strokeWidth="8"
          />
          {/* Cercle de progression */}
          {score > 0 && (
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke={levelInfo.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-dashoffset 1s ease-out',
              }}
            />
          )}
        </svg>
        {/* Score au centre */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold text-ink">
            {score}
            <span className="text-xl font-normal text-ink-faint">/100</span>
          </span>
        </div>
      </div>

      {/* Pill niveau */}
      <div className={`mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full ${pillClass}`}>
        <span className="text-sm font-semibold">
          {levelInfo.label}
        </span>
      </div>

      {/* Terrain bonus */}
      {terrainBonus !== undefined && terrainBonus !== 0 && (
        <div
          className={`mt-2 flex items-center gap-1 text-sm font-medium ${
            terrainBonus > 0 ? 'text-moss' : 'text-danger'
          }`}
        >
          <span className="material-symbols-outlined !text-base leading-none" aria-hidden="true">
            {terrainBonus > 0 ? 'keyboard_double_arrow_up' : 'keyboard_double_arrow_down'}
          </span>
          Terrain bonus: {terrainBonus > 0 ? '+' : ''}{terrainBonus} pts
        </div>
      )}
    </div>
  );
}
