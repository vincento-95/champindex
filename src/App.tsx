// ============================================================
// ChampIndex — Application principale
// ============================================================

import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import type { AppView, ResultTab, Spot, MushroomScore, ForecastDay, ForagingCategory } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useMushroomScore } from './hooks/useMushroomScore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import SpotSelector from './components/SpotSelector';
import Layout from './components/Layout';
import HabitatExplorer from './components/HabitatExplorer';
import Notebook from './components/Notebook';
import BottomNav from './components/BottomNav';

// Code-split : composants lourds chargés à la demande
const HeatmapView = lazy(() => import('./components/HeatmapView'));
const MapSelector = lazy(() => import('./components/MapSelector'));
const PlantIdentifier = lazy(() => import('./components/PlantIdentifier'));

function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-900/90 backdrop-blur-sm px-4 py-2 text-center">
      <p className="text-xs text-amber-200 font-medium">
        📡 Mode hors-ligne — données en cache
      </p>
    </div>
  );
}

function LazyFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-emerald-400 animate-spin" />
      <p className="text-sm text-white/40">Chargement...</p>
    </div>
  );
}

// Vues qui affichent la bottom nav
const VIEWS_WITH_NAV: AppView[] = ['home', 'identify', 'notebook', 'habitats'];

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState<ResultTab>('score');
  const [currentScore, setCurrentScore] = useState<MushroomScore | null>(null);
  const [currentForecast, setCurrentForecast] = useState<ForecastDay[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ForagingCategory>('mushroom');

  const isOnline = useOnlineStatus();
  const { coordinates, loading: geoLoading, error: geoError, requestPosition } = useGeolocation();
  const { loading: scoreLoading, error: scoreError, calculateScore } = useMushroomScore();

  useEffect(() => {
    if (coordinates && view === 'home') {
      handleAnalyze({ name: '', lat: coordinates.lat, lon: coordinates.lon, region: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates]);

  const handleAnalyze = useCallback(async (spot: Spot) => {
    setView('results');
    setActiveTab('score');
    const result = await calculateScore(
      { lat: spot.lat, lon: spot.lon },
      spot.name || undefined,
      selectedCategory
    );
    if (result) {
      setCurrentScore(result.score);
      setCurrentForecast(result.forecast);
    }
  }, [calculateScore, selectedCategory]);

  const handleUsePosition = useCallback(() => {
    requestPosition();
  }, [requestPosition]);

  const handleBack = useCallback(() => {
    setView('home');
    setCurrentScore(null);
    setCurrentForecast([]);
  }, []);

  const handleNavigate = useCallback((target: AppView) => {
    if (target === 'home') {
      setCurrentScore(null);
      setCurrentForecast([]);
    }
    setView(target);
  }, []);

  const showBottomNav = VIEWS_WITH_NAV.includes(view);
  const offlineBanner = !isOnline ? <OfflineBanner /> : null;

  // ---- Loading screen ----
  if ((view === 'results' && scoreLoading) || (view === 'home' && geoLoading && coordinates === null)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-amber-400 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl">
            {selectedCategory === 'mushroom' ? '🍄' : selectedCategory === 'plant' ? '🌿' : '🫐'}
          </span>
        </div>
        <p className="text-sm text-white/50 animate-pulse">Analyse en cours...</p>
        <p className="text-xs text-white/30">Météo · Terrain · Espèces</p>
      </div>
    );
  }

  // ---- Error screen ----
  if (view === 'results' && scoreError && !currentScore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8">
        <span className="text-5xl">😕</span>
        <p className="text-sm text-red-300 text-center">{scoreError}</p>
        <button
          onClick={handleBack}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors"
        >
          ← Retour
        </button>
      </div>
    );
  }

  // ---- Fullscreen views (no bottom nav) ----

  if (view === 'heatmap') {
    return (
      <Suspense fallback={<LazyFallback />}>
        <HeatmapView onBack={handleBack} selectedCategory={selectedCategory} />
      </Suspense>
    );
  }

  if (view === 'map') {
    return (
      <Suspense fallback={<LazyFallback />}>
        <MapSelector onSelectLocation={handleAnalyze} onBack={handleBack} />
      </Suspense>
    );
  }

  if (view === 'results' && currentScore) {
    return (
      <Layout
        score={currentScore}
        forecast={currentForecast}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onChangeSpot={handleBack}
        selectedCategory={selectedCategory}
      />
    );
  }

  // ---- Views with bottom nav ----
  return (
    <>
      {offlineBanner}

      {/* Padding bottom pour la nav bar */}
      <div className={showBottomNav ? 'pb-20' : ''}>
        {view === 'home' && (
          <SpotSelector
            onSelectSpot={handleAnalyze}
            onUsePosition={handleUsePosition}
            onOpenHeatmap={() => setView('heatmap')}
            onOpenHabitats={() => setView('habitats')}
            onOpenNotebook={() => setView('notebook')}
            onOpenIdentify={() => setView('identify')}
            geoLoading={geoLoading}
            geoError={geoError}
            selectedCategory={selectedCategory}
            onChangeCategory={setSelectedCategory}
          />
        )}

        {view === 'identify' && (
          <Suspense fallback={<LazyFallback />}>
            <PlantIdentifier onBack={() => setView('home')} />
          </Suspense>
        )}

        {view === 'notebook' && (
          <Notebook onBack={() => setView('home')} selectedCategory={selectedCategory} />
        )}

        {view === 'habitats' && (
          <HabitatExplorer onBack={() => setView('home')} selectedCategory={selectedCategory} />
        )}
      </div>

      {showBottomNav && <BottomNav activeView={view} onNavigate={handleNavigate} />}
    </>
  );
}
