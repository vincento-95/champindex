// ============================================================
// ChampIndex — Jauge circulaire SVG
// ============================================================

import type { ScoreLevelInfo } from '../types';

interface ScoreGaugeProps {
  score: number;
  levelInfo: ScoreLevelInfo;
  terrainBonus?: number;
}

export default function ScoreGauge({ score, levelInfo, terrainBonus }: ScoreGaugeProps) {
  // Accessibilité : annonce du score
  const ariaLabel = `Score de ${score} sur 100. Niveau : ${levelInfo.label}`;

  // Arc SVG : 240° d'arc (pas cercle complet)
  const radius = 90;
  const strokeWidth = 12;
  const center = 110;
  const startAngle = 150; // Début en bas-gauche
  const endAngle = 390;   // Fin en bas-droite (240° d'arc)
  const totalArc = endAngle - startAngle;

  const scoreAngle = startAngle + (score / 100) * totalArc;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  return (
    <div className="flex flex-col items-center py-6" role="status" aria-label={ariaLabel}>
      <svg width="220" height="200" viewBox="0 0 220 200" aria-hidden="true">
        {/* Fond de la jauge */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Arc coloré */}
        {score > 0 && (
          <path
            d={describeArc(startAngle, scoreAngle)}
            fill="none"
            stroke={levelInfo.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${levelInfo.color}80)`,
              transition: 'all 1s ease-out',
            }}
          />
        )}
        {/* Score au centre */}
        <text
          x={center}
          y={center - 10}
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: '48px', fontFamily: 'Playfair Display, serif', fontWeight: 700 }}
        >
          {score}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          className="fill-white/60"
          style={{ fontSize: '16px' }}
        >
          / 100
        </text>
      </svg>

      {/* Badge label + terrain bonus (inspiré maquette Stitch) */}
      <div className="flex items-center justify-center gap-3 -mt-4">
        <span
          className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide"
          style={{ color: levelInfo.color, backgroundColor: `${levelInfo.color}20` }}
        >
          {levelInfo.label} {levelInfo.emoji}
        </span>
        {terrainBonus !== undefined && terrainBonus !== 0 && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            terrainBonus >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            ⛰️ {terrainBonus > 0 ? '+' : ''}{terrainBonus} pts
          </span>
        )}
      </div>
    </div>
  );
}
