// ============================================================
// Import habitats, lieux et alertes météo
// depuis foraging_habitats_lieux.xlsx
//
// Usage:
//   node scripts/import-habitats.mjs --preview
//   node scripts/import-habitats.mjs --generate
// ============================================================

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXCEL_PATH = 'C:/Users/vince/Downloads/foraging_habitats_lieux.xlsx';

// ── Helpers ──

function toKebabId(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeStr(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function parseRegions(raw) {
  const s = (raw || '').trim();
  if (!s) return [];
  return s.split(/[,;]/).map(r => r.trim()).filter(Boolean);
}

function parseGPS(raw) {
  const s = (raw || '').trim();
  if (!s) return { lat: 0, lng: 0 };
  // Format: "48.4, 2.7" or "48.4 / 2.7"
  const parts = s.split(/[,/]/).map(p => parseFloat(p.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return { lat: 0, lng: 0 };
}

function parseArea(raw) {
  const s = (raw || '').trim();
  if (!s) return undefined;
  // "25 000 ha" → 25000
  const match = s.match(/([\d\s]+)\s*ha/i);
  if (match) return parseInt(match[1].replace(/\s/g, ''));
  // "~150 km" → convert to ha approx
  const kmMatch = s.match(/([\d\s]+)\s*km/i);
  if (kmMatch) return parseInt(kmMatch[1].replace(/\s/g, '')) * 100; // rough km→ha
  return undefined;
}

function mapReliability(raw) {
  const s = (raw || '').trim().toUpperCase();
  if (s.includes('HAUTE')) return 'high';
  if (s.includes('BASSE') || s.includes('FAIBLE')) return 'low';
  return 'medium';
}

function isHeaderRow(row, firstCol) {
  const val = (row[firstCol] || '').trim();
  return val.startsWith('▸') || val === '';
}

// ============================================================
// HABITATS
// ============================================================

function processHabitats(wb) {
  const data = XLSX.utils.sheet_to_json(wb.Sheets["Types d'habitats"], { defval: '' });
  const habitats = [];

  for (const row of data) {
    if (isHeaderRow(row, "Type d'habitat")) continue;

    const name = (row["Type d'habitat"] || '').trim();
    if (!name) continue;

    habitats.push({
      id: toKebabId(name),
      name,
      vegetation: (row['Végétation dominante'] || '').trim(),
      soilType: (row['Sol / Substrat'] || '').trim(),
      altitudeRange: (row['Altitude'] || '').trim(),
      regions: parseRegions(row['Régions']),
      mushroomsFound: (row['Champignons à trouver'] || '').trim(),
      plantsFound: (row['Plantes sauvages à trouver'] || '').trim(),
      berriesFound: (row['Baies & fruits à trouver'] || '').trim(),
    });
  }

  return habitats;
}

function generateHabitatsFile(habitats) {
  let out = `// ============================================================
// ChampIndex — Base de données des habitats
// Généré par scripts/import-habitats.mjs — ${habitats.length} habitats
// ============================================================

export interface Habitat {
  id: string;
  name: string;
  vegetation: string;
  soilType: string;
  altitudeRange: string;
  regions: string[];
  mushroomsFound: string;
  plantsFound: string;
  berriesFound: string;
}

export const HABITATS: Habitat[] = [\n`;

  for (const h of habitats) {
    out += `  {
    id: '${escapeStr(h.id)}',
    name: '${escapeStr(h.name)}',
    vegetation: '${escapeStr(h.vegetation)}',
    soilType: '${escapeStr(h.soilType)}',
    altitudeRange: '${escapeStr(h.altitudeRange)}',
    regions: [${h.regions.map(r => `'${escapeStr(r)}'`).join(', ')}],
    mushroomsFound: '${escapeStr(h.mushroomsFound)}',
    plantsFound: '${escapeStr(h.plantsFound)}',
    berriesFound: '${escapeStr(h.berriesFound)}',
  },\n`;
  }

  out += `];\n`;
  return out;
}

// ============================================================
// LOCATIONS
// ============================================================

function processLocations(wb) {
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Lieux concrets France'], { defval: '' });
  const locations = [];

  for (const row of data) {
    if (isHeaderRow(row, 'Lieu / Forêt / Zone')) continue;

    const name = (row['Lieu / Forêt / Zone'] || '').trim();
    if (!name) continue;

    const gps = parseGPS(row['Coordonnées GPS (approx.)']);
    const area = parseArea(row['Superficie / Étendue']);

    locations.push({
      id: toKebabId(name),
      name,
      department: (row['Département / Région'] || '').trim(),
      areaHectares: area,
      habitatType: (row['Type de milieu'] || '').trim(),
      mainMushrooms: (row['Champignons principaux'] || '').trim(),
      mainPlantsBerries: (row['Plantes, baies & fruits'] || '').trim(),
      bestPeriod: (row['Meilleure période'] || '').trim(),
      notes: (row['Notes / Réglementation'] || '').trim(),
      lat: gps.lat,
      lng: gps.lng,
    });
  }

  return locations;
}

function generateLocationsFile(locations) {
  let out = `// ============================================================
// ChampIndex — Lieux concrets de cueillette en France
// Généré par scripts/import-habitats.mjs — ${locations.length} lieux
// ============================================================

export interface ForagingLocation {
  id: string;
  name: string;
  department: string;
  areaHectares?: number;
  habitatType: string;
  mainMushrooms: string;
  mainPlantsBerries: string;
  bestPeriod: string;
  notes: string;
  lat: number;
  lng: number;
}

export const FORAGING_LOCATIONS: ForagingLocation[] = [\n`;

  for (const loc of locations) {
    out += `  {
    id: '${escapeStr(loc.id)}',
    name: '${escapeStr(loc.name)}',
    department: '${escapeStr(loc.department)}',
    ${loc.areaHectares !== undefined ? `areaHectares: ${loc.areaHectares},\n    ` : ''}habitatType: '${escapeStr(loc.habitatType)}',
    mainMushrooms: '${escapeStr(loc.mainMushrooms)}',
    mainPlantsBerries: '${escapeStr(loc.mainPlantsBerries)}',
    bestPeriod: '${escapeStr(loc.bestPeriod)}',
    notes: '${escapeStr(loc.notes)}',
    lat: ${loc.lat},
    lng: ${loc.lng},
  },\n`;
  }

  out += `];\n`;
  return out;
}

// ============================================================
// WEATHER ALERTS
// ============================================================

function processAlerts(wb) {
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Alertes météo (app)'], { defval: '' });
  const alerts = [];
  let idx = 0;

  for (const row of data) {
    const condition = (row['Condition météo déclenchante'] || '').trim();
    if (!condition) continue;

    alerts.push({
      id: `alert-${++idx}`,
      condition,
      targetSpecies: (row['Espèce ciblée'] || '').trim(),
      whereToLook: (row['Où chercher'] || '').trim(),
      period: (row['Période'] || '').trim(),
      reliability: mapReliability(row['Fiabilité alerte']),
      appMessage: (row['Message app suggéré'] || '').trim(),
    });
  }

  return alerts;
}

function generateAlertsFile(alerts) {
  let out = `// ============================================================
// ChampIndex — Alertes météo déclenchantes
// Généré par scripts/import-habitats.mjs — ${alerts.length} alertes
// ============================================================

export interface WeatherAlert {
  id: string;
  condition: string;
  targetSpecies: string;
  whereToLook: string;
  period: string;
  reliability: 'high' | 'medium' | 'low';
  appMessage: string;
}

export const WEATHER_ALERTS: WeatherAlert[] = [\n`;

  for (const a of alerts) {
    out += `  {
    id: '${escapeStr(a.id)}',
    condition: '${escapeStr(a.condition)}',
    targetSpecies: '${escapeStr(a.targetSpecies)}',
    whereToLook: '${escapeStr(a.whereToLook)}',
    period: '${escapeStr(a.period)}',
    reliability: '${a.reliability}',
    appMessage: '${escapeStr(a.appMessage)}',
  },\n`;
  }

  out += `];\n`;
  return out;
}

// ============================================================
// MAIN
// ============================================================

const mode = process.argv[2] || '--preview';
const wb = XLSX.readFile(EXCEL_PATH);

const habitats = processHabitats(wb);
const locations = processLocations(wb);
const alerts = processAlerts(wb);

console.log(`Habitats: ${habitats.length}`);
console.log(`Locations: ${locations.length}`);
console.log(`Alerts: ${alerts.length}`);

if (mode === '--preview') {
  console.log('\n═══ HABITATS (3 premiers) ═══');
  habitats.slice(0, 3).forEach(h => console.log(JSON.stringify(h, null, 2)));

  console.log('\n═══ LOCATIONS (3 premiers) ═══');
  locations.slice(0, 3).forEach(l => console.log(JSON.stringify(l, null, 2)));

  console.log('\n═══ ALERTS (3 premiers) ═══');
  alerts.slice(0, 3).forEach(a => console.log(JSON.stringify(a, null, 2)));

} else if (mode === '--generate') {
  const habitatsOut = path.join(ROOT, 'src/lib/habitats-db.ts');
  const locationsOut = path.join(ROOT, 'src/lib/locations-db.ts');
  const alertsOut = path.join(ROOT, 'src/lib/weather-alerts-db.ts');

  fs.writeFileSync(habitatsOut, generateHabitatsFile(habitats), 'utf8');
  console.log(`Written ${habitatsOut}`);

  fs.writeFileSync(locationsOut, generateLocationsFile(locations), 'utf8');
  console.log(`Written ${locationsOut}`);

  fs.writeFileSync(alertsOut, generateAlertsFile(alerts), 'utf8');
  console.log(`Written ${alertsOut}`);
}
