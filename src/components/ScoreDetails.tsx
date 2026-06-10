// ============================================================
// ChampIndex — Détail des facteurs de scoring
// ============================================================

import type { WeatherScoreDetail } from '../types';

interface ScoreDetailsProps {
  details: WeatherScoreDetail[];
}

const impactColors: Record<string, { bg: string; text: string }> = {
  '++': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  '+': { bg: 'bg-green-500/20', text: 'text-green-400' },
  '~': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  '-': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  '--': { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const factorIcons: Record<string, string> = {
  rain14: '💧',
  rain3: '🌧️',
  temperature: '🌡️',
  amplitude: '🌓',
  season: '📅',
};

export default function ScoreDetails({ details }: ScoreDetailsProps) {
  return (
    <div className="space-y-2 px-4">
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
        Analyse détaillée
      </h3>
      {details.map((detail) => {
        const colors = impactColors[detail.impact] || impactColors['~'];
        return (
          <div
            key={detail.factor}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{factorIcons[detail.factor] || '📊'}</span>
              <div>
                <p className="text-sm font-medium text-white/90">{detail.label}</p>
                <p className="text-xs text-white/50">{detail.score}/{detail.maxScore} pts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">{detail.value}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
              >
                {detail.impact}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
