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
  'bon': { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  'moyen': { dot: 'bg-amber-400', text: 'text-amber-400' },
  'défavorable': { dot: 'bg-red-400', text: 'text-red-400' },
};

const statIcons: Record<string, string> = {
  altitude: '⛰️',
  slope: '📐',
  exposure: '🧭',
  twi: '💧',
};

export default function TerrainAnalysis({ terrain, terrainScore }: TerrainAnalysisProps) {
  return (
    <div className="px-4 py-4">
      {/* Lignes topographiques décoratives + boussole */}
      <div className="flex items-center justify-between mb-6">
        {/* Mini topo */}
        <div className="flex-1">
          <svg width="100%" height="60" viewBox="0 0 200 60" className="opacity-30">
            <path d="M0,50 Q30,10 60,30 T120,20 T180,40 T200,25" fill="none" stroke="#d4a855" strokeWidth="1" />
            <path d="M0,55 Q40,25 80,40 T140,30 T200,45" fill="none" stroke="#d4a855" strokeWidth="0.5" />
            <path d="M0,45 Q50,20 100,35 T160,15 T200,30" fill="none" stroke="#d4a855" strokeWidth="0.5" opacity="0.5" />
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
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{statIcons[detail.factor] || '📊'}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              </div>
              <p className="text-2xl font-bold text-white/90" style={{ fontFamily: 'Playfair Display, serif' }}>
                {detail.value}
              </p>
              <p className="text-xs text-white/50 mt-1">{detail.label}</p>
              <p className={`text-xs font-medium mt-1 ${colors.text}`}>
                {detail.favorable === 'bon' ? 'Favorable' : detail.favorable === 'moyen' ? 'Neutre' : 'Défavorable'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Score terrain total */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Contribution terrain</p>
            <p className="text-xs text-white/40 mt-1">
              Les pentes douces orientées nord retiennent mieux l'humidité
            </p>
          </div>
          <span
            className={`text-2xl font-bold ${terrainScore.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {terrainScore.total > 0 ? '+' : ''}{terrainScore.total} pts
          </span>
        </div>
      </div>
    </div>
  );
}
