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

export default function ScoreGauge({ score, levelInfo, terrainBonus }: ScoreGaugeProps) {
  // Accessibilité : annonce du score
  const ariaLabel = `Score de ${score} sur 100. Niveau : ${levelInfo.label}`;

  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

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
            stroke="#2d3828"
            strokeOpacity="0.6"
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
                filter: `drop-shadow(0 0 6px ${levelInfo.color}66)`,
              }}
            />
          )}
        </svg>
        {/* Score au centre */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">
            {score}
            <span className="text-xl font-normal text-white/50">/100</span>
          </span>
        </div>
      </div>

      {/* Pill niveau (inspiré maquette Stitch) */}
      <div
        className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full border"
        style={{
          color: levelInfo.color,
          backgroundColor: `${levelInfo.color}20`,
          borderColor: `${levelInfo.color}4D`,
        }}
      >
        <span className="text-sm font-bold">
          {levelInfo.label} {levelInfo.emoji}
        </span>
      </div>

      {/* Terrain bonus */}
      {terrainBonus !== undefined && terrainBonus !== 0 && (
        <div
          className={`mt-2 flex items-center gap-1 text-sm font-medium ${
            terrainBonus > 0 ? 'text-emerald-400' : 'text-red-400'
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
