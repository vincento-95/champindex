// ============================================================
// Tests — Moteur de scoring multi-catégorie
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeHeatmapProbability, getScoreLevel, computeWeatherScoreForCategory } from '../foraging-scoring';

// ── Helper : données météo simulées ──

function makeDailyData(overrides: Partial<{
  tempMean: number;
  tempMax: number;
  tempMin: number;
  rain: number;
  et0: number;
  days: number;
}> = {}) {
  const days = overrides.days ?? 15;
  const tempMean = overrides.tempMean ?? 14;
  const tempMax = overrides.tempMax ?? (tempMean + 5);
  const tempMin = overrides.tempMin ?? (tempMean - 5);
  const rain = overrides.rain ?? 3;
  const et0 = overrides.et0 ?? 2.5;

  return {
    time: Array.from({ length: days }, (_, i) => `2025-10-${String(i + 1).padStart(2, '0')}`),
    temperature_2m_max: Array(days).fill(tempMax),
    temperature_2m_min: Array(days).fill(tempMin),
    temperature_2m_mean: Array(days).fill(tempMean),
    precipitation_sum: Array(days).fill(rain),
    et0_fao_evapotranspiration: Array(days).fill(et0),
  };
}

function makeWeatherData(overrides?: Parameters<typeof makeDailyData>[0]) {
  return { daily: makeDailyData(overrides) } as any;
}

// ── Score levels ──

describe('getScoreLevel', () => {
  it('returns exceptionnel for 80+', () => {
    expect(getScoreLevel(80)).toBe('exceptionnel');
    expect(getScoreLevel(100)).toBe('exceptionnel');
  });
  it('returns defavorable for <20', () => {
    expect(getScoreLevel(0)).toBe('defavorable');
    expect(getScoreLevel(19)).toBe('defavorable');
  });
  it('returns moyen for 35-49', () => {
    expect(getScoreLevel(35)).toBe('moyen');
    expect(getScoreLevel(49)).toBe('moyen');
  });
});

// ── Heatmap scoring : champignons ──

describe('computeHeatmapProbability — mushroom', () => {
  it('returns high score for ideal autumn mushroom conditions', () => {
    // Bonne pluie, temp 10-15°C, sol humide
    const daily = makeDailyData({ tempMean: 12, rain: 5, et0: 1.5 });
    const { score, stats } = computeHeatmapProbability(daily, 'mushroom');
    expect(score).toBeGreaterThanOrEqual(50);
    expect(stats.rain14d).toBeGreaterThan(0);
    expect(stats.tempMean7d).toBeCloseTo(12, 0);
  });

  it('returns low score for very dry conditions', () => {
    const daily = makeDailyData({ tempMean: 12, rain: 0, et0: 4 });
    const { score } = computeHeatmapProbability(daily, 'mushroom');
    expect(score).toBeLessThan(30);
  });

  it('score is between 0 and 100', () => {
    const daily = makeDailyData({ tempMean: 25, rain: 0 });
    const { score } = computeHeatmapProbability(daily, 'mushroom');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── Heatmap scoring : plantes ──

describe('computeHeatmapProbability — plant', () => {
  it('returns high score for ideal spring plant conditions', () => {
    const daily = makeDailyData({ tempMean: 15, rain: 3, et0: 3 });
    const { score } = computeHeatmapProbability(daily, 'plant');
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('penalizes freezing temperatures', () => {
    const daily = makeDailyData({ tempMean: -2, rain: 2 });
    const { score: coldScore } = computeHeatmapProbability(daily, 'plant');
    const { score: warmScore } = computeHeatmapProbability(makeDailyData({ tempMean: 15, rain: 2 }), 'plant');
    // Cold should score lower than warm
    expect(coldScore).toBeLessThan(warmScore);
  });
});

// ── Heatmap scoring : baies ──

describe('computeHeatmapProbability — berry', () => {
  it('returns high score for warm sunny summer conditions', () => {
    const daily = makeDailyData({ tempMean: 22, rain: 0.5, et0: 4 });
    const { score } = computeHeatmapProbability(daily, 'berry');
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('penalizes excessive rain (bad for ripening)', () => {
    const warm = makeDailyData({ tempMean: 22, rain: 0.5 });
    const rainy = makeDailyData({ tempMean: 22, rain: 8 });
    const { score: warmScore } = computeHeatmapProbability(warm, 'berry');
    const { score: rainyScore } = computeHeatmapProbability(rainy, 'berry');
    expect(warmScore).toBeGreaterThan(rainyScore);
  });
});

// ── Weather score for detail view ──

describe('computeWeatherScoreForCategory', () => {
  it('returns a total between 0-100 for mushroom', () => {
    const result = computeWeatherScoreForCategory(makeWeatherData(), 'mushroom');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.details.length).toBe(5);
  });

  it('returns a total between 0-100 for plant', () => {
    const result = computeWeatherScoreForCategory(makeWeatherData(), 'plant');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.details.length).toBe(5);
  });

  it('returns a total between 0-100 for berry', () => {
    const result = computeWeatherScoreForCategory(makeWeatherData(), 'berry');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.details.length).toBe(5);
  });

  it('different categories produce different scores for same weather', () => {
    const weather = makeWeatherData({ tempMean: 20, rain: 2 });
    const mushroom = computeWeatherScoreForCategory(weather, 'mushroom');
    const plant = computeWeatherScoreForCategory(weather, 'plant');
    const berry = computeWeatherScoreForCategory(weather, 'berry');
    // They shouldn't all be identical
    const scores = [mushroom.total, plant.total, berry.total];
    const allSame = scores.every(s => s === scores[0]);
    expect(allSame).toBe(false);
  });
});
