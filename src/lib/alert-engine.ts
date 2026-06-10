// ============================================================
// ChampIndex — Moteur de matching des alertes météo
//
// Chaque alerte a des conditions programmatiques (température,
// pluie, saison) vérifiées contre les stats météo réelles.
// ============================================================

import { WEATHER_ALERTS, type WeatherAlert } from './weather-alerts-db';
import type { HeatmapStats } from './heatmap-api';

export interface ActiveAlert {
  alert: WeatherAlert;
  relevance: number; // 0-100
}

// ── Règles programmatiques par alerte ──

interface AlertRule {
  months: number[];
  check: (s: HeatmapStats, month: number) => number; // 0-100 relevance
}

const MONTH_MAP: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 3, Avr: 4, Mai: 5, Jun: 6,
  Jul: 7, Août: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function monthRange(from: string, to: string): number[] {
  const start = MONTH_MAP[from];
  const end = MONTH_MAP[to];
  if (!start || !end) return [];
  const months: number[] = [];
  let m = start;
  while (true) {
    months.push(m);
    if (m === end) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

// Score partiel : plus la valeur est proche de l'idéal, plus le score est haut
function tempFit(temp: number, min: number, max: number): number {
  if (temp >= min && temp <= max) return 100;
  const dist = temp < min ? min - temp : temp - max;
  return Math.max(0, 100 - dist * 15);
}

function rainFit(rain: number, min: number, max: number): number {
  if (rain >= min && rain <= max) return 100;
  if (rain < min) return Math.max(0, 100 - (min - rain) * 8);
  return Math.max(0, 100 - (rain - max) * 5);
}

const RULES: Record<string, AlertRule> = {
  'alert-1': { // Cèpes — Pluie > 20mm + T° 15-22°C
    months: monthRange('Sep', 'Nov'),
    check: (s) => Math.round((rainFit(s.rain14d, 20, 80) + tempFit(s.tempMean7d, 12, 22)) / 2),
  },
  'alert-2': { // Trompettes — Pluie continue 3+ jours + T° 8-15°C
    months: monthRange('Oct', 'Nov'),
    check: (s) => {
      const wetOk = s.wetDays7 >= 3 ? 100 : s.wetDays7 === 2 ? 50 : 0;
      return Math.round((wetOk + tempFit(s.tempMean7d, 8, 15)) / 2);
    },
  },
  'alert-3': { // Girolles — Pluie modérée + T° 15-25°C
    months: monthRange('Jun', 'Oct'),
    check: (s) => Math.round((rainFit(s.rain14d, 15, 60) + tempFit(s.tempMean7d, 15, 25)) / 2),
  },
  'alert-4': { // Morilles — T° sol > 10°C + pluie printanière
    months: monthRange('Mar', 'Mai'),
    check: (s) => Math.round((tempFit(s.tempMean7d, 10, 20) + rainFit(s.rain14d, 10, 50)) / 2),
  },
  'alert-5': { // Mousserons — T° 12-18°C + pluie douce
    months: monthRange('Avr', 'Mai'),
    check: (s) => Math.round((tempFit(s.tempMean7d, 12, 18) + rainFit(s.rain14d, 5, 30)) / 2),
  },
  'alert-6': { // Rosés des prés — Nuits fraîches + pluie puis beau
    months: monthRange('Août', 'Oct'),
    check: (s) => {
      const ampOk = s.amplitude >= 10 ? 100 : s.amplitude >= 7 ? 60 : 20;
      const dryRecent = s.rain3d < 5 ? 100 : s.rain3d < 10 ? 50 : 10;
      const hadRain = s.rain14d >= 10 ? 100 : s.rain14d >= 5 ? 50 : 0;
      return Math.round((ampOk + dryRecent + hadRain) / 3);
    },
  },
  'alert-7': { // Pleurotes — Choc thermique + pluie
    months: monthRange('Oct', 'Mar'),
    check: (s) => {
      const shock = s.tempDrop >= 5 ? 100 : s.tempDrop >= 3 ? 60 : s.tempDrop >= 1 ? 20 : 0;
      const rain = s.rain3d >= 3 ? 100 : s.rain3d >= 1 ? 40 : 0;
      return Math.round((shock + rain) / 2);
    },
  },
  'alert-8': { // Pied bleu — Premières gelées + T° jour > 5°C
    months: monthRange('Nov', 'Dec'),
    check: (s) => tempFit(s.tempMean7d, 2, 8),
  },
  'alert-9': { // Ail des ours — T° > 15°C + sol humide
    months: monthRange('Mar', 'Avr'),
    check: (s) => Math.round((tempFit(s.tempMean7d, 10, 18) + rainFit(s.rain14d, 15, 60)) / 2),
  },
  'alert-10': { // Ortie — Pluie printanière + T° > 10°C
    months: monthRange('Mar', 'Mai'),
    check: (s) => s.tempMean7d > 10 && s.rain14d > 10 ? 70 : s.tempMean7d > 8 ? 40 : 10,
  },
  'alert-11': { // Algues — Grande marée (toujours pertinent en saison)
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    check: () => 50, // Relevance fixe — on ne peut pas checker les marées via météo
  },
  'alert-12': { // Salicorne — T° > 18°C + été
    months: monthRange('Jun', 'Sep'),
    check: (s) => s.tempMean7d >= 18 ? 80 : s.tempMean7d >= 15 ? 50 : 15,
  },
  'alert-13': { // Mûres — Été chaud + quelques pluies
    months: monthRange('Jul', 'Sep'),
    check: (s) => {
      const hot = s.tempMean7d >= 20 ? 100 : s.tempMean7d >= 16 ? 60 : 20;
      const rain = rainFit(s.rain14d, 5, 50);
      return Math.round((hot + rain) / 2);
    },
  },
  'alert-14': { // Prunelles, cynorhodons — Premières gelées
    months: monthRange('Nov', 'Dec'),
    check: (s) => s.tempMean7d < 5 ? 80 : s.tempMean7d < 8 ? 50 : 15,
  },
  'alert-15': { // Myrtilles — Été humide de montagne
    months: monthRange('Jul', 'Août'),
    check: (s) => Math.round((rainFit(s.rain14d, 20, 80) + tempFit(s.tempMean7d, 10, 20)) / 2),
  },
  'alert-16': { // Truffe noire — Hiver frais
    months: monthRange('Dec', 'Mar'),
    check: (s) => tempFit(s.tempMean7d, 2, 10),
  },
  'alert-17': { // Châtaignes — Premières gelées légères
    months: monthRange('Oct', 'Nov'),
    check: (s) => s.tempMean7d < 10 ? 80 : s.tempMean7d < 13 ? 50 : 20,
  },
  'alert-18': { // Coulemelle — Pluie abondante puis beau temps
    months: monthRange('Sep', 'Nov'),
    check: (s) => {
      const hadRain = s.rain14d >= 20 ? 100 : s.rain14d >= 10 ? 50 : 0;
      const dryNow = s.rain3d < 5 ? 100 : s.rain3d < 10 ? 50 : 10;
      const temp = tempFit(s.tempMean7d, 10, 20);
      return Math.round((hadRain + dryNow + temp) / 3);
    },
  },
  'alert-19': { // Chanterelles en tube — T° nocturne basse + pluie
    months: monthRange('Oct', 'Dec'),
    check: (s) => {
      const nightCold = s.amplitude >= 8 && s.tempMean7d < 12 ? 100 : s.tempMean7d < 15 ? 50 : 10;
      const rain = rainFit(s.rain14d, 15, 60);
      return Math.round((nightCold + rain) / 2);
    },
  },
  'alert-20': { // Cèpes de montagne — Pluie + T° + altitude
    months: monthRange('Août', 'Oct'),
    check: (s) => Math.round((rainFit(s.rain14d, 15, 60) + tempFit(s.tempMean7d, 15, 25)) / 2),
  },
};

// ============================================================
// API publique
// ============================================================

/**
 * Match les alertes contre les stats météo actuelles.
 * Retourne les alertes actives triées par pertinence.
 */
export function matchAlerts(
  stats: HeatmapStats,
  month?: number,
): ActiveAlert[] {
  const currentMonth = month ?? new Date().getMonth() + 1;
  const results: ActiveAlert[] = [];

  for (const alert of WEATHER_ALERTS) {
    const rule = RULES[alert.id];
    if (!rule) continue;

    // Vérifier la saison
    if (!rule.months.includes(currentMonth)) continue;

    // Calculer la pertinence
    const relevance = rule.check(stats, currentMonth);
    if (relevance >= 35) {
      results.push({ alert, relevance });
    }
  }

  return results.sort((a, b) => {
    // Trier par fiabilité puis par pertinence
    const relOrder = { high: 3, medium: 2, low: 1 };
    const relDiff = relOrder[b.alert.reliability] - relOrder[a.alert.reliability];
    if (relDiff !== 0) return relDiff;
    return b.relevance - a.relevance;
  });
}

/**
 * Alertes saisonnières (sans données météo — pour l'accueil).
 * Retourne les alertes dont la période inclut le mois courant.
 */
export function getSeasonalAlerts(month?: number): WeatherAlert[] {
  const currentMonth = month ?? new Date().getMonth() + 1;
  return WEATHER_ALERTS.filter(alert => {
    const rule = RULES[alert.id];
    return rule?.months.includes(currentMonth);
  });
}
