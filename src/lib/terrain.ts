// ============================================================
// ChampIndex — Calcul terrain (pente, exposition, TWI)
// ============================================================

import type { ElevationGrid, TerrainData, TerrainScore, TerrainScoreDetail } from '../types';

/**
 * Génère une grille de 9 points (3×3) espacés de ~50m autour du point central
 */
export function getElevationGrid(lat: number, lon: number, spacing = 50): { lat: number; lon: number }[] {
  const dLat = spacing / 111320;
  const dLon = spacing / (111320 * Math.cos(lat * Math.PI / 180));
  const points: { lat: number; lon: number }[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      points.push({
        lat: lat + dy * dLat,
        lon: lon + dx * dLon,
      });
    }
  }
  return points; // 9 points en grille 3×3
}

/**
 * Calcule pente, exposition et TWI depuis une grille d'élévation 3×3
 * La grille est organisée :
 *   [0] [1] [2]    NW  N  NE
 *   [3] [4] [5]     W  C   E
 *   [6] [7] [8]    SW  S  SE
 */
export function computeTerrainData(grid: ElevationGrid, spacing = 50): TerrainData {
  const e = grid.points.map(p => p.elevation);
  const cellSize = spacing; // distance en mètres entre les points

  // Gradient en X (Est-Ouest) : (e_E - e_W) / (2 × cellSize)
  const dzdx = (e[5] - e[3]) / (2 * cellSize);
  // Gradient en Y (Nord-Sud) : (e_N - e_S) / (2 × cellSize)
  const dzdy = (e[1] - e[7]) / (2 * cellSize);

  // Pente en degrés
  const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  const slope = slopeRad * (180 / Math.PI);

  // Exposition (azimut en degrés, 0=Nord, 90=Est, 180=Sud, 270=Ouest)
  let aspect = Math.atan2(-dzdy, -dzdx) * (180 / Math.PI);
  if (aspect < 0) aspect += 360;

  // Altitude du point central
  const altitude = grid.centerElevation;

  // TWI simplifié : ln(contributingArea / tan(slopeRad))
  // Pour une approximation, on utilise une aire contributive fictive basée sur la pente
  const tanSlope = Math.tan(Math.max(slopeRad, 0.01)); // éviter division par 0
  const contributingArea = cellSize * cellSize; // aire simple de la cellule
  const twi = Math.log(contributingArea / tanSlope);

  return {
    slope: Math.round(slope * 10) / 10,
    aspect: Math.round(aspect),
    aspectLabel: getAspectLabel(aspect),
    altitude: Math.round(altitude),
    twi: Math.round(twi * 10) / 10,
    twiLabel: twi > 8 ? 'Élevée' : twi > 5 ? 'Moyenne' : 'Faible',
  };
}

function getAspectLabel(aspect: number): string {
  if (aspect >= 337.5 || aspect < 22.5) return 'Nord';
  if (aspect >= 22.5 && aspect < 67.5) return 'Nord-Est';
  if (aspect >= 67.5 && aspect < 112.5) return 'Est';
  if (aspect >= 112.5 && aspect < 157.5) return 'Sud-Est';
  if (aspect >= 157.5 && aspect < 202.5) return 'Sud';
  if (aspect >= 202.5 && aspect < 247.5) return 'Sud-Ouest';
  if (aspect >= 247.5 && aspect < 292.5) return 'Ouest';
  return 'Nord-Ouest';
}

/**
 * Score terrain : bonus/malus de -20 à +20
 */
export function computeTerrainScore(terrain: TerrainData): TerrainScore {
  const details: TerrainScoreDetail[] = [];

  // ---- PENTE ----
  let slopeBonus: number;
  let slopeFavorable: TerrainScoreDetail['favorable'];

  if (terrain.slope >= 5 && terrain.slope <= 15) {
    slopeBonus = 8; slopeFavorable = 'bon';
  } else if (terrain.slope < 3) {
    slopeBonus = 3; slopeFavorable = 'moyen';
  } else if (terrain.slope > 30) {
    slopeBonus = -5; slopeFavorable = 'défavorable';
  } else {
    slopeBonus = 4; slopeFavorable = 'moyen';
  }

  details.push({
    factor: 'slope',
    label: 'Pente',
    value: `${terrain.slope}°`,
    score: slopeBonus,
    favorable: slopeFavorable,
  });

  // ---- EXPOSITION ----
  let exposureBonus: number;
  let exposureFavorable: TerrainScoreDetail['favorable'];
  const isNorth = terrain.aspect >= 315 || terrain.aspect < 90;
  const isSouth = terrain.aspect >= 135 && terrain.aspect < 225;

  if (isNorth) {
    exposureBonus = 7; exposureFavorable = 'bon';
  } else if (isSouth) {
    exposureBonus = -3; exposureFavorable = 'défavorable';
  } else {
    exposureBonus = 2; exposureFavorable = 'moyen';
  }

  details.push({
    factor: 'exposure',
    label: 'Exposition',
    value: terrain.aspectLabel,
    score: exposureBonus,
    favorable: exposureFavorable,
  });

  // ---- ALTITUDE ----
  let altitudeBonus: number;
  let altitudeFavorable: TerrainScoreDetail['favorable'];

  if (terrain.altitude >= 200 && terrain.altitude <= 800) {
    altitudeBonus = 5; altitudeFavorable = 'bon';
  } else if (terrain.altitude >= 800 && terrain.altitude <= 1500) {
    altitudeBonus = 2; altitudeFavorable = 'moyen';
  } else if (terrain.altitude > 1500) {
    altitudeBonus = -5; altitudeFavorable = 'défavorable';
  } else {
    altitudeBonus = 0; altitudeFavorable = 'moyen';
  }

  details.push({
    factor: 'altitude',
    label: 'Altitude',
    value: `${terrain.altitude}m`,
    score: altitudeBonus,
    favorable: altitudeFavorable,
  });

  // ---- TWI (Humidité terrain) ----
  let twiBonus: number;
  let twiFavorable: TerrainScoreDetail['favorable'];

  if (terrain.twi > 8) {
    twiBonus = 5; twiFavorable = 'bon';
  } else if (terrain.twi > 5) {
    twiBonus = 2; twiFavorable = 'moyen';
  } else {
    twiBonus = 0; twiFavorable = 'défavorable';
  }

  details.push({
    factor: 'twi',
    label: 'Humidité terrain',
    value: terrain.twiLabel,
    score: twiBonus,
    favorable: twiFavorable,
  });

  const total = slopeBonus + exposureBonus + altitudeBonus + twiBonus;

  return { total, details };
}
