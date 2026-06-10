// ============================================================
// ChampIndex — Layout principal avec navigation par onglets
// ============================================================

import { useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ResultTab, MushroomScore, ForecastDay, ForagingCategory } from '../types';
import { FORAGING_SPECIES, getForagingByMonth } from '../lib/foraging-db';
import { matchAlerts } from '../lib/alert-engine';
import { checkAndNotify } from '../lib/notifications';
import ScoreGauge from './ScoreGauge';
import ScoreDetails from './ScoreDetails';
import Advice from './Advice';
import ForecastStrip from './ForecastStrip';
import TerrainAnalysis from './TerrainAnalysis';
import SpeciesList from './SpeciesList';
import { AlertBanner } from './AlertBanner';
import { IconMushroom, IconPlant, IconBerry, IconLocationLeaf } from './Icons';
import type { HeatmapStats } from '../lib/heatmap-api';

interface LayoutProps {
  score: MushroomScore;
  forecast: ForecastDay[];
  activeTab: ResultTab;
  onChangeTab: (tab: ResultTab) => void;
  onChangeSpot: () => void;
  selectedCategory: ForagingCategory;
}

const CATEGORY_ICONS: Record<ForagingCategory, ReactNode> = {
  mushroom: <IconMushroom size={18} />,
  plant: <IconPlant size={18} />,
  berry: <IconBerry size={18} />,
};

export default function Layout({
  score,
  forecast,
  activeTab,
  onChangeTab,
  onChangeSpot,
  selectedCategory,
}: LayoutProps) {
  const tabs: { id: ResultTab; label: string; icon: ReactNode }[] = [
    {
      id: 'score',
      label: 'Score',
      icon: <span className="material-symbols-outlined !text-[18px] leading-none" aria-hidden="true">target</span>,
    },
    {
      id: 'forecast',
      label: '7 jours',
      icon: <span className="material-symbols-outlined !text-[18px] leading-none" aria-hidden="true">calendar_month</span>,
    },
    {
      id: 'terrain',
      label: 'Terrain',
      icon: <span className="material-symbols-outlined !text-[18px] leading-none" aria-hidden="true">landscape</span>,
    },
    { id: 'species', label: 'Espèces', icon: CATEGORY_ICONS[selectedCategory] },
  ];

  // Stats synthétiques pour les alertes (extraites des détails météo du score)
  const alertStats = useMemo((): HeatmapStats | null => {
    const d = score.weather.details;
    const rain14Val = parseFloat(d.find(x => x.factor === 'rain14')?.value || d.find(x => x.factor === 'moisture')?.value || '0');
    const rain3Val = parseFloat(d.find(x => x.factor === 'rain3')?.value || d.find(x => x.factor === 'ripening')?.value || '0');
    const tempVal = parseFloat(d.find(x => x.factor === 'temperature')?.value || '12');
    const ampVal = parseFloat(d.find(x => x.factor === 'amplitude')?.value || d.find(x => x.factor === 'stability')?.value || '8');
    if (isNaN(rain14Val) && isNaN(tempVal)) return null;
    return {
      rain14d: isNaN(rain14Val) ? 30 : rain14Val,
      rain3d: isNaN(rain3Val) ? 8 : rain3Val,
      tempMean7d: isNaN(tempVal) ? 12 : tempVal,
      tempDrop: 3,
      wetDays7: 3,
      amplitude: isNaN(ampVal) ? 8 : ampVal,
      et0_7d: 20,
      soilBalance: (isNaN(rain14Val) ? 30 : rain14Val) * 0.4,
    };
  }, [score.weather.details]);

  // Notification native si les conditions matchent une alerte
  // (la fonction gère elle-même permission + throttle 6h)
  useEffect(() => {
    if (alertStats) checkAndNotify(alertStats);
  }, [alertStats]);

  // Titre de section affiché uniquement si AlertBanner a du contenu
  const hasAlerts = useMemo(
    () => (alertStats ? matchAlerts(alertStats).length > 0 : false),
    [alertStats],
  );

  // Espèces à afficher selon la catégorie
  const speciesForTab = useMemo(() => {
    if (selectedCategory === 'mushroom') {
      // Retrouver les ForagingSpecies correspondant aux MushroomSpecies du score
      const ids = new Set(score.species.map(s => s.id));
      return FORAGING_SPECIES.filter(s => ids.has(s.id) && s.category === 'mushroom');
    }
    // Pour plantes/baies : filtrer par mois courant
    const month = new Date().getMonth() + 1;
    return getForagingByMonth(month, selectedCategory);
  }, [selectedCategory, score.species]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <IconLocationLeaf size={18} className="flex-shrink-0 text-moss" />
          <span className="font-display text-base font-medium text-ink truncate">{score.location}</span>
        </div>
        <button
          onClick={onChangeSpot}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-ink
            bg-paper-raised border border-line-strong hover:bg-paper-deep transition-colors"
        >
          Changer
        </button>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-line" role="tablist" aria-label="Résultats">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChangeTab(tab.id)}
            className={`flex-1 py-3 text-center transition-all duration-200 relative
              ${activeTab === tab.id
                ? 'text-moss'
                : 'text-ink-faint hover:text-ink-soft'
              }`}
          >
            <span className="flex justify-center" aria-hidden="true">{tab.icon}</span>
            <span className="block text-xs mt-0.5 font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-moss rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Contenu de l'onglet actif */}
      <main className="flex-1 overflow-y-auto pb-8 animate-fade-in" role="tabpanel" id={`tabpanel-${activeTab}`} aria-label={tabs.find(t => t.id === activeTab)?.label} key={activeTab}>
        {activeTab === 'score' && (
          <>
            <ScoreGauge score={score.total} levelInfo={score.levelInfo} terrainBonus={score.terrain?.total} />
            <ScoreDetails details={score.weather.details} />
            <Advice advice={score.levelInfo.advice} />
            {alertStats && (
              <section className="mt-6">
                {hasAlerts && (
                  <h3 className="px-5 text-[11px] font-semibold text-ink-faint uppercase tracking-[0.18em] mb-1">
                    Alertes Espèces
                  </h3>
                )}
                <AlertBanner stats={alertStats} />
              </section>
            )}
          </>
        )}

        {activeTab === 'forecast' && (
          <ForecastStrip days={forecast} />
        )}

        {activeTab === 'terrain' && score.terrain && (
          <TerrainAnalysis
            terrain={{
              slope: score.terrain.details.find(d => d.factor === 'slope')?.value
                ? parseFloat(score.terrain.details.find(d => d.factor === 'slope')!.value)
                : 0,
              aspect: 0,
              aspectLabel: score.terrain.details.find(d => d.factor === 'exposure')?.value || 'N/A',
              altitude: score.terrain.details.find(d => d.factor === 'altitude')?.value
                ? parseInt(score.terrain.details.find(d => d.factor === 'altitude')!.value)
                : 0,
              twi: 0,
              twiLabel: score.terrain.details.find(d => d.factor === 'twi')?.value || 'N/A',
            }}
            terrainScore={score.terrain}
          />
        )}

        {activeTab === 'terrain' && !score.terrain && (
          <div className="flex flex-col items-center justify-center py-16 text-ink-faint">
            <span className="material-symbols-outlined !text-4xl mb-3" aria-hidden="true">landscape</span>
            <p className="text-sm">Données terrain indisponibles pour ce spot</p>
          </div>
        )}

        {activeTab === 'species' && (
          <SpeciesList species={speciesForTab} selectedCategory={selectedCategory} />
        )}
      </main>

      {/* Footer source */}
      <footer className="px-4 py-2 text-center text-[10px] text-ink-faint border-t border-line">
        Données : Open-Meteo · Open-Elevation · OpenStreetMap · {score.date}
      </footer>
    </div>
  );
}
