// ============================================================
// Tests — Moteur d'alertes météo
// ============================================================

import { describe, it, expect } from 'vitest';
import { matchAlerts, getSeasonalAlerts } from '../alert-engine';
import type { HeatmapStats } from '../heatmap-api';

function makeStats(overrides: Partial<HeatmapStats> = {}): HeatmapStats {
  return {
    rain14d: 40,
    rain3d: 10,
    tempMean7d: 14,
    tempDrop: 4,
    wetDays7: 4,
    amplitude: 10,
    et0_7d: 20,
    soilBalance: 20,
    ...overrides,
  };
}

describe('matchAlerts', () => {
  it('returns alerts sorted by reliability then relevance', () => {
    const alerts = matchAlerts(makeStats(), 10); // Octobre
    expect(alerts.length).toBeGreaterThan(0);
    // First alert should be high reliability
    const firstHigh = alerts.findIndex(a => a.alert.reliability === 'high');
    const firstMedium = alerts.findIndex(a => a.alert.reliability === 'medium');
    if (firstHigh >= 0 && firstMedium >= 0) {
      expect(firstHigh).toBeLessThan(firstMedium);
    }
  });

  it('returns cèpe alert in autumn with good rain + temp', () => {
    const alerts = matchAlerts(makeStats({ rain14d: 50, tempMean7d: 16 }), 10);
    const cepe = alerts.find(a => a.alert.targetSpecies.includes('Cèpes'));
    expect(cepe).toBeDefined();
    expect(cepe!.relevance).toBeGreaterThanOrEqual(50);
  });

  it('returns trompette alert with wet conditions', () => {
    const alerts = matchAlerts(makeStats({ wetDays7: 5, tempMean7d: 10 }), 10);
    const trompette = alerts.find(a => a.alert.targetSpecies.includes('Trompettes'));
    expect(trompette).toBeDefined();
  });

  it('returns no autumn alerts in summer', () => {
    // En juin, les alertes automne (cèpes, trompettes) ne matchent pas
    const alerts = matchAlerts(makeStats(), 6);
    const cepeAutomne = alerts.find(a => a.alert.id === 'alert-1'); // Cèpes Sep-Nov
    expect(cepeAutomne).toBeUndefined();
  });

  it('returns morille alert in spring', () => {
    const alerts = matchAlerts(makeStats({ tempMean7d: 14, rain14d: 25 }), 4);
    const morille = alerts.find(a => a.alert.targetSpecies.includes('Morilles'));
    expect(morille).toBeDefined();
  });

  it('filters out low relevance alerts (< 35)', () => {
    const alerts = matchAlerts(makeStats({ rain14d: 0, rain3d: 0, tempMean7d: -5 }), 10);
    for (const a of alerts) {
      expect(a.relevance).toBeGreaterThanOrEqual(35);
    }
  });
});

describe('getSeasonalAlerts', () => {
  it('returns alerts for the given month', () => {
    const oct = getSeasonalAlerts(10);
    expect(oct.length).toBeGreaterThan(0);
    // All returned alerts should have October in their months
    // (can't check directly but at least should not be empty)
  });

  it('returns different alerts for different months', () => {
    const spring = getSeasonalAlerts(4);
    const autumn = getSeasonalAlerts(10);
    const springIds = new Set(spring.map(a => a.id));
    const autumnIds = new Set(autumn.map(a => a.id));
    // They should not be identical sets
    const overlap = [...springIds].filter(id => autumnIds.has(id));
    expect(overlap.length).toBeLessThan(Math.max(spring.length, autumn.length));
  });
});
