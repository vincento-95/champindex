import XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.readFile('C:/Users/vince/Downloads/foraging_lieux_complet.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets['Lieux de foraging France'], { defval: '' });

function toKebab(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseArea(s) {
  if (!s) return undefined;
  const m = String(s).match(/([\d\s]+)\s*ha/i);
  return m ? parseInt(m[1].replace(/\s/g, '')) : undefined;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

const locations = [];
for (const row of data) {
  const name = (row['Lieu précis'] || '').trim();
  if (!name || name.startsWith('▸')) continue;

  const lat = parseFloat(row['Latitude']);
  const lng = parseFloat(row['Longitude']);
  if (isNaN(lat) || isNaN(lng)) continue;

  locations.push({
    id: toKebab(name),
    name,
    department: (row['Département'] || '').trim(),
    region: (row['Région'] || '').trim(),
    areaHectares: parseArea(row['Superficie']),
    habitatType: (row['Type de milieu'] || '').trim(),
    mainMushrooms: (row['Champignons'] || '').trim(),
    mainPlants: (row['Plantes sauvages'] || '').trim(),
    mainBerries: (row['Baies & Fruits'] || '').trim(),
    bestPeriod: (row['Meilleure période'] || '').trim(),
    notes: (row['Accès / Réglementation'] || '').trim(),
    lat,
    lng,
  });
}

console.log(`Parsed ${locations.length} locations`);

let out = `// ============================================================
// ChampIndex — Lieux de foraging en France
// Généré depuis foraging_lieux_complet.xlsx — ${locations.length} lieux
// ============================================================

export interface ForagingLocation {
  id: string;
  name: string;
  department: string;
  region: string;
  areaHectares?: number;
  habitatType: string;
  mainMushrooms: string;
  mainPlants: string;
  mainBerries: string;
  bestPeriod: string;
  notes: string;
  lat: number;
  lng: number;
}

export const FORAGING_LOCATIONS: ForagingLocation[] = [\n`;

for (const loc of locations) {
  out += `  {
    id: '${esc(loc.id)}',
    name: '${esc(loc.name)}',
    department: '${esc(loc.department)}',
    region: '${esc(loc.region)}',
    ${loc.areaHectares ? `areaHectares: ${loc.areaHectares},\n    ` : ''}habitatType: '${esc(loc.habitatType)}',
    mainMushrooms: '${esc(loc.mainMushrooms)}',
    mainPlants: '${esc(loc.mainPlants)}',
    mainBerries: '${esc(loc.mainBerries)}',
    bestPeriod: '${esc(loc.bestPeriod)}',
    notes: '${esc(loc.notes)}',
    lat: ${loc.lat},
    lng: ${loc.lng},
  },\n`;
}

out += `];\n`;
fs.writeFileSync('src/lib/locations-db.ts', out);
console.log(`Written src/lib/locations-db.ts (${locations.length} locations)`);
