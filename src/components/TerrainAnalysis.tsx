// ============================================================
// ChampIndex — Analyse terrain (Écran 4)
// ============================================================

import type { TerrainScore, TerrainData } from '../types';
import CompassRose from './CompassRose';

interface TerrainAnalysisProps {
  terrain: TerrainData;
  terrainScore: TerrainScore;
}

const favorableColors = {
  'bon': { dot: 'bg-moss', text: 'text-moss' },
  'moyen': { dot: 'bg-line-strong', text: 'text-ink-soft' },
  'défavorable': { dot: 'bg-danger', text: 'text-danger' },
};

const statIcons: Record<string, string> = {
  altitude: 'landscape',
  slope: 'trending_up',
  exposure: 'explore',
  twi: 'water_drop',
};

export default function TerrainAnalysis({ terrain, terrainScore }: TerrainAnalysisProps) {
  return (
    <div className="px-4 py-4">
      {/* Lignes topographiques décoratives + boussole */}
      <div className="flex items-center justify-between mb-6">
        {/* Mini topo */}
        <div className="flex-1">
          <svg width="100%" height="60" viewBox="0 0 200 60" className="opacity-40">
            <path d="M0,50 Q30,10 60,30 T120,20 T180,40 T200,25" fill="none" stroke="var(--color-ink-soft)" strokeWidth="1" />
            <path d="M0,55 Q40,25 80,40 T140,30 T200,45" fill="none" stroke="var(--color-ink-soft)" strokeWidth="0.5" />
            <path d="M0,45 Q50,20 100,35 T160,15 T200,30" fill="none" stroke="var(--color-ink-soft)" strokeWidth="0.5" opacity="0.5" />
          </svg>
        </div>
        {/* Boussole */}
        <CompassRose aspect={terrain.aspect} aspectLabel={terrain.aspectLabel} />
      </div>

      {/* Grille de stats 2×2 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {terrainScore.details.map((detail) => {
          const colors = favorableColors[detail.favorable];
          return (
            <div
              key={detail.factor}
              className="p-4 rounded-2xl bg-paper-raised border border-line"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined !text-xl text-ink-faint" aria-hidden="true">
                  {statIcons[detail.factor] || 'analytics'}
                </span>
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              </div>
              <p className="font-display text-2xl font-semibold text-ink">
                {detail.value}
              </p>
              <p className="text-xs text-ink-soft mt-1">{detail.label}</p>
              <p className={`text-xs font-medium mt-1 ${colors.text}`}>
                {detail.favorable === 'bon' ? 'Favorable' : detail.favorable === 'moyen' ? 'Neutre' : 'Défavorable'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Score terrain total */}
      <div className="p-4 rounded-2xl bg-paper-deep">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">Contribution terrain</p>
            <p className="text-xs text-ink-soft mt-1">
              Les pentes douces orientées nord retiennent mieux l'humidité
            </p>
          </div>
          <span
            className={`font-display text-2xl font-semibold ${terrainScore.total >= 0 ? 'text-moss' : 'text-danger'}`}
          >
            {terrainScore.total > 0 ? '+' : ''}{terrainScore.total} pts
          </span>
        </div>
      </div>
    </div>
  );
}
