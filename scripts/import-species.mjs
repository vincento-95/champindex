// ============================================================
// Import 309 espèces depuis foraging_database_complete.xlsx
// Génère src/lib/foraging-db.ts
//
// Usage:
//   node scripts/import-species.mjs --preview   (5 exemples)
//   node scripts/import-species.mjs --generate  (génère le fichier)
// ============================================================

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXCEL_PATH = 'C:/Users/vince/Documents/Application Champignons/foraging_database_complete.xlsx';
const OUTPUT_PATH = path.join(ROOT, 'src/lib/foraging-db.ts');

// ============================================================
// 1. Lire les données existantes (25 espèces enrichies)
// ============================================================

function loadExistingSpecies() {
  const code = fs.readFileSync(OUTPUT_PATH, 'utf8');

  // Extraire le contenu du tableau FORAGING_SPECIES
  const match = code.match(/export const FORAGING_SPECIES:\s*ForagingSpecies\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!match) throw new Error('Could not find FORAGING_SPECIES array in existing file');

  // Définir makeSeason pour l'eval
  function makeSeason(debut, fin, peaks) {
    const keys = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec'];
    const detail = {};
    for (let i = 0; i < 12; i++) {
      const m = i + 1;
      let inRange;
      if (debut <= fin) {
        inRange = m >= debut && m <= fin;
      } else {
        inRange = m >= debut || m <= fin;
      }
      if (!inRange) detail[keys[i]] = 'none';
      else if (peaks.includes(m)) detail[keys[i]] = 'peak';
      else detail[keys[i]] = 'season';
    }
    return detail;
  }

  // Eval the array content as JS
  const arrayContent = match[1];
  let species;
  try {
    species = eval(`[${arrayContent}]`);
  } catch (e) {
    throw new Error('Failed to eval existing species: ' + e.message);
  }

  // Build map by latin name
  const map = new Map();
  for (const sp of species) {
    map.set(sp.latin, sp);
  }
  return map;
}

// ============================================================
// 2. Mappings & parsing
// ============================================================

const MONTH_KEYS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const SEASON_KEYS = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec'];

function parseSeasonDetail(row) {
  const detail = {};
  for (let i = 0; i < 12; i++) {
    const val = String(row[MONTH_KEYS[i]] || '').trim().toUpperCase();
    detail[SEASON_KEYS[i]] = val === 'P' ? 'peak' : val === 'S' ? 'season' : 'none';
  }
  return detail;
}

function computeMoisRange(saisonDetail) {
  const active = [];
  for (let i = 0; i < 12; i++) {
    if (saisonDetail[SEASON_KEYS[i]] !== 'none') active.push(i + 1);
  }
  if (active.length === 0) return { moisDebut: 1, moisFin: 12 };
  return { moisDebut: active[0], moisFin: active[active.length - 1] };
}

function mapComestibilite(raw) {
  const s = (raw || '').trim();
  const lower = s.toLowerCase();
  let comestibilite = 'bon';
  let avertissement = '';

  if (lower.includes('mortel')) { comestibilite = 'mortel'; }
  else if (lower.includes('toxique') && !lower.includes('non comestible')) { comestibilite = 'toxique'; }
  else if (lower === 'exceptionnel') { comestibilite = 'exceptionnel'; }
  else if (lower === 'excellent') { comestibilite = 'excellent'; }
  else if (lower === 'très bon') { comestibilite = 'tres_bon'; }
  else if (lower.startsWith('bon')) {
    comestibilite = 'bon';
    if (lower.includes('cuit')) avertissement = 'Doit être bien cuit avant consommation.';
    if (lower.includes('jeune')) avertissement = 'À consommer jeune uniquement.';
  }
  else if (lower.startsWith('moyen')) {
    comestibilite = 'moyen';
    if (lower.includes('controversé') || lower.includes('rhabdomyolyse')) avertissement = 'Comestibilité controversée.';
    if (lower.includes('blanchi')) avertissement = 'Nécessite blanchiment avant consommation.';
  }
  else if (lower.startsWith('médiocre')) { comestibilite = 'mediocre'; }
  else if (lower.includes('médicinal') || lower.includes('tisane')) { comestibilite = 'medicinal'; }
  else if (lower.includes('non comestible')) {
    comestibilite = 'non_comestible';
    if (lower.includes('toxique')) comestibilite = 'toxique';
  }
  else if (lower.includes('controversé') || lower.includes('rhabdomyolyse')) {
    comestibilite = 'moyen';
    avertissement = 'Comestibilité controversée.';
  }

  return { comestibilite, avertissement };
}

function mapComestibilitePlantBerry(row) {
  const parties = (row['Parties comestibles'] || '').trim();
  const danger = (row['Niveau danger confusion'] || '').trim();
  const nom = (row['Nom commun'] || '').trim();

  // Toxic/mortal species
  if (nom.startsWith('⚠') || danger.includes('MORTEL')) return { comestibilite: 'mortel', avertissement: 'ESPÈCE MORTELLE. Ne pas consommer.' };
  if (danger.includes('TOXIQUE') || parties.toUpperCase() === 'TOXIQUE') return { comestibilite: 'toxique', avertissement: 'ESPÈCE TOXIQUE. Ne pas consommer.' };

  let avertissement = '';
  let comestibilite = 'bon';

  if (parties.toLowerCase().includes('cuit')) {
    avertissement = 'Doit être cuit avant consommation.';
  }
  if (parties.toLowerCase().includes('modération')) {
    comestibilite = 'moyen';
    avertissement = 'À consommer avec modération.';
  }

  return { comestibilite, avertissement };
}

function mapDangerConfusion(raw) {
  const s = (raw || '').trim();
  if (s.includes('MORTEL')) return 'mortel';
  if (s.includes('TOXIQUE')) return 'mortel'; // N/A — TOXIQUE = espèce dangereuse elle-même
  if (s === 'Très faible') return 'tres_faible';
  if (s === 'Faible') return 'faible';
  if (s === 'Moyen') return 'moyen';
  if (s === 'Élevé') return 'eleve';
  if (s === 'Très élevé') return 'tres_eleve';
  return 'faible';
}

function parseConfusions(raw) {
  const s = (raw || '').trim();
  if (!s || s.toLowerCase().startsWith('aucun')) return [];

  // Split by comma, but handle parenthetical contents
  const entries = [];
  let current = '';
  let parenDepth = 0;
  for (const ch of s) {
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (ch === ',' && parenDepth === 0) {
      entries.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) entries.push(current.trim());

  return entries.map(entry => {
    let danger = 'inoffensif';
    if (/\(MORTEL\)/i.test(entry) || /mortel/i.test(entry)) danger = 'mortel';
    else if (/\(TOXIQUE\)/i.test(entry) || /toxique/i.test(entry)) danger = 'toxique';

    // Clean the species name
    const espece = entry
      .replace(/\s*\(MORTEL\)/gi, '')
      .replace(/\s*\(TOXIQUE\)/gi, '')
      .replace(/\s*\(toxique avec alcool\)/gi, '')
      .replace(/\s*\(non toxique\)/gi, '')
      .replace(/\s*\(non dangereux\)/gi, '')
      .replace(/\s*\(non comestibles?\)/gi, '')
      .replace(/\s*\(inférieure?\)/gi, '')
      .replace(/\s*\(comestible\)/gi, '')
      .trim();

    return {
      espece,
      danger,
      description: '',
    };
  }).filter(c => c.espece.length > 0);
}

function toKebabId(latin) {
  return latin
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseHabitats(raw) {
  const s = (raw || '').trim();
  if (!s) return [];
  return s.split(/[,;]/).map(h =>
    h.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  ).filter(Boolean);
}

function parseRegions(raw) {
  const s = (raw || '').trim();
  if (!s) return ['toute_france'];
  if (s.toLowerCase().includes('toute france')) return ['toute_france'];
  return s.split(/[,;]/).map(r =>
    r.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  ).filter(Boolean);
}

function parseEssences(habitat, category) {
  // For mushrooms, habitat often contains tree names
  const s = (habitat || '').trim();
  if (!s) return [];
  if (category === 'mushroom') {
    // Tree names are the essences
    return s.split(/[,;]/).map(e => e.trim().toLowerCase()).filter(Boolean);
  }
  // For plants/berries, essences are less relevant
  return [];
}

/** Derive reasonable temp defaults from active season months */
function deriveTempDefaults(saisonDetail) {
  const peaks = [];
  const actives = [];
  for (let i = 0; i < 12; i++) {
    const v = saisonDetail[SEASON_KEYS[i]];
    if (v === 'peak') peaks.push(i + 1);
    if (v !== 'none') actives.push(i + 1);
  }
  const ref = peaks.length > 0 ? peaks : actives;
  if (ref.length === 0) return { tempMin: 0, tempMax: 25 };

  const avg = ref.reduce((a, b) => a + b, 0) / ref.length;

  // Winter-ish (Nov-Feb)
  if (avg >= 11.5 || avg <= 2.5) return { tempMin: -2, tempMax: 12 };
  // Spring (Mar-May)
  if (avg >= 3 && avg <= 5.5) return { tempMin: 5, tempMax: 22 };
  // Summer (Jun-Aug)
  if (avg >= 6 && avg <= 8.5) return { tempMin: 12, tempMax: 35 };
  // Autumn (Sep-Nov)
  if (avg >= 9 && avg <= 11) return { tempMin: 3, tempMax: 20 };
  // Mixed
  return { tempMin: 0, tempMax: 25 };
}

// ============================================================
// 3. Convert a row to ForagingSpecies
// ============================================================

function convertRow(row, category, existingMap) {
  const latin = (row['Nom latin'] || '').trim();
  const nom = (row['Nom commun'] || '').trim().replace(/^⚠\s*/, '');

  // Check if this species exists in current data
  const existing = existingMap.get(latin);

  const saisonDetail = parseSeasonDetail(row);
  const { moisDebut, moisFin } = computeMoisRange(saisonDetail);

  // Comestibilité
  let comestResult;
  if (category === 'mushroom') {
    comestResult = mapComestibilite(row['Comestibilité'] || '');
  } else {
    comestResult = mapComestibilitePlantBerry(row);
  }

  const dangerConfusion = mapDangerConfusion(row['Niveau danger confusion']);
  const confusionsFromExcel = parseConfusions(row['Confusions possibles']);
  const habitatsFromExcel = parseHabitats(row['Habitat']);
  const regionsFromExcel = parseRegions(row['Région France']);
  const essencesFromExcel = parseEssences(row['Habitat'], category);

  const emoji = category === 'mushroom' ? '🍄' : category === 'plant' ? '🌿' : '🫐';

  const tempDefaults = deriveTempDefaults(saisonDetail);

  if (existing) {
    // MERGE: keep existing enriched data, add Excel-only fields
    return {
      ...existing,
      // Update from Excel only if existing doesn't have it or Excel has richer data
      nom: existing.nom || nom,
      saisonDetail,
      moisDebut: existing.moisDebut,
      moisFin: existing.moisFin,
      confusions: existing.confusions.length > 0 ? existing.confusions : confusionsFromExcel,
      habitats: existing.habitats.length > 0 ? existing.habitats : habitatsFromExcel,
      regions: existing.regions.length > 0 && existing.regions[0] !== 'toute_france'
        ? existing.regions
        : regionsFromExcel,
      dangerConfusion: existing.dangerConfusion,
      comestibilite: existing.comestibilite,
      // Preserve all existing fields
      _source: 'existing+excel',
    };
  }

  // NEW species
  const partiesComestibles = (category !== 'mushroom')
    ? (row['Parties comestibles'] || '').trim()
    : undefined;

  // Clean up partiesComestibles for toxic species
  const cleanParties = (partiesComestibles === 'TOXIQUE' || !partiesComestibles) ? undefined : partiesComestibles;

  return {
    id: toKebabId(latin),
    category,
    nom,
    latin,
    emoji,
    comestibilite: comestResult.comestibilite,
    partiesComestibles: cleanParties || undefined,
    dangerConfusion,
    confusions: confusionsFromExcel,
    moisDebut,
    moisFin,
    saisonDetail,
    tempMin: tempDefaults.tempMin,
    tempMax: tempDefaults.tempMax,
    besoinPluie: 'modéré',
    altitudeMin: 0,
    altitudeMax: 2000,
    expositionPreferee: 'indifférent',
    pentePreferee: 'indifférent',
    essences: essencesFromExcel,
    habitats: habitatsFromExcel,
    regions: regionsFromExcel,
    description: undefined,
    conseilsCueillette: undefined,
    usagesCulinaires: undefined,
    avertissement: comestResult.avertissement || undefined,
    _source: 'excel',
  };
}

// ============================================================
// 4. Read Excel & process
// ============================================================

function readExcel() {
  const wb = XLSX.readFile(EXCEL_PATH);

  const sheets = [
    { name: 'Champignons', category: 'mushroom' },
    { name: 'Plantes sauvages', category: 'plant' },
    { name: 'Baies & Fruits sauvages', category: 'berry' },
  ];

  const allRows = [];
  for (const { name, category } of sheets) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
    for (const row of data) {
      allRows.push({ row, category });
    }
  }
  return allRows;
}

// ============================================================
// 5. Generate output
// ============================================================

function escapeStr(s) {
  if (s === undefined || s === null) return undefined;
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function serializeSpecies(sp) {
  const lines = [];
  lines.push(`  {`);
  lines.push(`    id: '${escapeStr(sp.id)}',`);
  lines.push(`    category: '${sp.category}',`);
  lines.push(`    nom: '${escapeStr(sp.nom)}',`);
  lines.push(`    latin: '${escapeStr(sp.latin)}',`);
  lines.push(`    emoji: '${sp.emoji}',`);
  lines.push(`    comestibilite: '${sp.comestibilite}',`);
  if (sp.partiesComestibles) {
    lines.push(`    partiesComestibles: '${escapeStr(sp.partiesComestibles)}',`);
  }
  lines.push(`    dangerConfusion: '${sp.dangerConfusion}',`);

  // Confusions
  if (sp.confusions.length === 0) {
    lines.push(`    confusions: [],`);
  } else {
    lines.push(`    confusions: [`);
    for (const c of sp.confusions) {
      lines.push(`      { espece: '${escapeStr(c.espece)}', danger: '${c.danger}', description: '${escapeStr(c.description || '')}' },`);
    }
    lines.push(`    ],`);
  }

  lines.push(`    moisDebut: ${sp.moisDebut}, moisFin: ${sp.moisFin},`);

  // saisonDetail inline
  const sd = sp.saisonDetail;
  lines.push(`    saisonDetail: { jan: '${sd.jan}', fev: '${sd.fev}', mar: '${sd.mar}', avr: '${sd.avr}', mai: '${sd.mai}', jun: '${sd.jun}', jul: '${sd.jul}', aou: '${sd.aou}', sep: '${sd.sep}', oct: '${sd.oct}', nov: '${sd.nov}', dec: '${sd.dec}' },`);

  lines.push(`    tempMin: ${sp.tempMin}, tempMax: ${sp.tempMax},`);
  if (sp.tempNuitMin !== undefined) lines.push(`    tempNuitMin: ${sp.tempNuitMin}, tempNuitMax: ${sp.tempNuitMax},`);
  lines.push(`    besoinPluie: '${sp.besoinPluie}',`);
  if (sp.humiditeMin !== undefined) lines.push(`    humiditeMin: ${sp.humiditeMin}, humiditeMax: ${sp.humiditeMax},`);
  if (sp.conditionDeclenchante) lines.push(`    conditionDeclenchante: '${escapeStr(sp.conditionDeclenchante)}',`);

  lines.push(`    altitudeMin: ${sp.altitudeMin}, altitudeMax: ${sp.altitudeMax},`);
  lines.push(`    expositionPreferee: '${sp.expositionPreferee}',`);
  lines.push(`    pentePreferee: '${sp.pentePreferee}',`);
  lines.push(`    essences: [${sp.essences.map(e => `'${escapeStr(e)}'`).join(', ')}],`);
  lines.push(`    habitats: [${sp.habitats.map(h => `'${escapeStr(h)}'`).join(', ')}],`);
  lines.push(`    regions: [${sp.regions.map(r => `'${escapeStr(r)}'`).join(', ')}],`);

  if (sp.description) lines.push(`    description: '${escapeStr(sp.description)}',`);
  if (sp.conseilsCueillette) lines.push(`    conseilsCueillette: '${escapeStr(sp.conseilsCueillette)}',`);
  if (sp.usagesCulinaires) lines.push(`    usagesCulinaires: '${escapeStr(sp.usagesCulinaires)}',`);
  if (sp.avertissement) lines.push(`    avertissement: '${escapeStr(sp.avertissement)}',`);

  lines.push(`  },`);
  return lines.join('\n');
}

function generateFile(allSpecies) {
  const mushrooms = allSpecies.filter(s => s.category === 'mushroom');
  const plants = allSpecies.filter(s => s.category === 'plant');
  const berries = allSpecies.filter(s => s.category === 'berry');

  let out = `// ============================================================
// ChampIndex — Base de données foraging multi-catégories
// Généré automatiquement par scripts/import-species.mjs
// ${mushrooms.length} champignons + ${plants.length} plantes + ${berries.length} baies = ${allSpecies.length} espèces
// ============================================================

import type {
  ForagingSpecies,
  MushroomSpecies,
} from '../types';

// Re-export spots pour compatibilité
export { SPOTS } from './species-db';

// ============================================================
// BASE COMPLÈTE
// ============================================================

export const FORAGING_SPECIES: ForagingSpecies[] = [

  // ═══════════════════════════════════════════════════════════
  // 🍄 CHAMPIGNONS (${mushrooms.length} espèces)
  // ═══════════════════════════════════════════════════════════

${mushrooms.map(s => serializeSpecies(s)).join('\n')
}

  // ═══════════════════════════════════════════════════════════
  // 🌿 PLANTES SAUVAGES (${plants.length} espèces)
  // ═══════════════════════════════════════════════════════════

${plants.map(s => serializeSpecies(s)).join('\n')
}

  // ═══════════════════════════════════════════════════════════
  // 🫐 BAIES & FRUITS SAUVAGES (${berries.length} espèces)
  // ═══════════════════════════════════════════════════════════

${berries.map(s => serializeSpecies(s)).join('\n')
}
];

// ============================================================
// EXPORTS DE COMPATIBILITÉ
// ============================================================

/** Champignons uniquement — compatibilité avec l'existant */
export const MUSHROOM_SPECIES = FORAGING_SPECIES.filter(s => s.category === 'mushroom');

/** Plantes uniquement */
export const PLANT_SPECIES = FORAGING_SPECIES.filter(s => s.category === 'plant');

/** Baies uniquement */
export const BERRY_SPECIES = FORAGING_SPECIES.filter(s => s.category === 'berry');

// ── Filtres ──

/**
 * Filtre les espèces foraging par mois courant
 */
export function getForagingByMonth(month: number, category?: ForagingSpecies['category']): ForagingSpecies[] {
  return FORAGING_SPECIES.filter(s => {
    if (category && s.category !== category) return false;
    if (s.moisDebut <= s.moisFin) {
      return month >= s.moisDebut && month <= s.moisFin;
    }
    return month >= s.moisDebut || month <= s.moisFin;
  });
}

/**
 * Filtre les espèces foraging par conditions terrain + météo
 */
export function getForagingForConditions(
  month: number,
  avgTemp: number,
  altitude: number,
  category?: ForagingSpecies['category'],
): ForagingSpecies[] {
  return getForagingByMonth(month, category).filter(s => {
    const tempOk = avgTemp >= s.tempMin - 3 && avgTemp <= s.tempMax + 3;
    const altOk = altitude >= s.altitudeMin && altitude <= s.altitudeMax;
    return tempOk && altOk;
  });
}

// ── Compatibilité legacy (species-db.ts) ──

/**
 * @deprecated — utiliser getForagingByMonth(month, 'mushroom')
 */
export function getSpeciesByMonth(month: number): MushroomSpecies[] {
  return getForagingByMonth(month, 'mushroom') as unknown as MushroomSpecies[];
}

/**
 * @deprecated — utiliser getForagingForConditions(month, avgTemp, altitude, 'mushroom')
 */
export function getSpeciesForConditions(
  month: number,
  avgTemp: number,
  altitude: number,
): MushroomSpecies[] {
  return getForagingForConditions(month, avgTemp, altitude, 'mushroom') as unknown as MushroomSpecies[];
}
`;

  return out;
}

// ============================================================
// MAIN
// ============================================================

const mode = process.argv[2] || '--preview';

// Load existing data
console.log('Loading existing species data...');
const existingMap = loadExistingSpecies();
console.log(`Found ${existingMap.size} existing species to preserve.`);

// Read Excel
console.log('Reading Excel...');
const allRows = readExcel();
console.log(`Read ${allRows.length} rows from Excel.`);

// Convert all
const allSpecies = [];
const seenLatins = new Set();

for (const { row, category } of allRows) {
  const latin = (row['Nom latin'] || '').trim();
  if (!latin) continue;

  const species = convertRow(row, category, existingMap);
  delete species._source;
  allSpecies.push(species);
  seenLatins.add(latin);
}

// Add existing species NOT in Excel (e.g., Infundibulicybe geotropa)
for (const [latin, sp] of existingMap) {
  if (!seenLatins.has(latin)) {
    console.log(`  Adding existing species not in Excel: ${latin} (${sp.nom})`);
    allSpecies.push(sp);
  }
}

// Sort: mushrooms first, then plants, then berries, alphabetical within each
allSpecies.sort((a, b) => {
  const catOrder = { mushroom: 0, plant: 1, berry: 2 };
  if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category];
  return a.nom.localeCompare(b.nom, 'fr');
});

console.log(`\nTotal species: ${allSpecies.length}`);
console.log(`  Mushrooms: ${allSpecies.filter(s => s.category === 'mushroom').length}`);
console.log(`  Plants: ${allSpecies.filter(s => s.category === 'plant').length}`);
console.log(`  Berries: ${allSpecies.filter(s => s.category === 'berry').length}`);

// Existing species preserved
const preserved = allSpecies.filter(s => existingMap.has(s.latin));
console.log(`  Existing species preserved: ${preserved.length}/${existingMap.size}`);

if (mode === '--preview') {
  console.log('\n════════════════════════════════════════');
  console.log('PREVIEW — 5 exemples (2 champignons, 2 plantes, 1 baie)');
  console.log('════════════════════════════════════════\n');

  const mushrooms = allSpecies.filter(s => s.category === 'mushroom');
  const plants = allSpecies.filter(s => s.category === 'plant');
  const berries = allSpecies.filter(s => s.category === 'berry');

  // 1 existing mushroom + 1 new mushroom
  const existingMushroom = mushrooms.find(s => s.latin === 'Boletus edulis');
  const newMushroom = mushrooms.find(s => !existingMap.has(s.latin) && s.comestibilite !== 'toxique' && s.comestibilite !== 'mortel');
  // 1 plant with danger + 1 safe plant
  const dangerPlant = plants.find(s => s.dangerConfusion === 'eleve' || s.dangerConfusion === 'tres_eleve');
  const safePlant = plants.find(s => s.dangerConfusion === 'tres_faible');
  // 1 berry
  const berry = berries.find(s => s.confusions.length > 0);

  const samples = [existingMushroom, newMushroom, dangerPlant, safePlant, berry].filter(Boolean);
  for (const sp of samples) {
    console.log(`── ${sp.emoji} ${sp.nom} (${sp.latin}) ──`);
    console.log(`   category: ${sp.category}`);
    console.log(`   comestibilite: ${sp.comestibilite}`);
    console.log(`   dangerConfusion: ${sp.dangerConfusion}`);
    console.log(`   confusions: ${JSON.stringify(sp.confusions)}`);
    console.log(`   moisDebut: ${sp.moisDebut}, moisFin: ${sp.moisFin}`);
    console.log(`   saisonDetail: ${JSON.stringify(sp.saisonDetail)}`);
    console.log(`   tempMin: ${sp.tempMin}, tempMax: ${sp.tempMax}`);
    console.log(`   besoinPluie: ${sp.besoinPluie}`);
    console.log(`   altitudeMin: ${sp.altitudeMin}, altitudeMax: ${sp.altitudeMax}`);
    console.log(`   expositionPreferee: ${sp.expositionPreferee}`);
    console.log(`   essences: ${JSON.stringify(sp.essences)}`);
    console.log(`   habitats: ${JSON.stringify(sp.habitats)}`);
    console.log(`   regions: ${JSON.stringify(sp.regions)}`);
    if (sp.partiesComestibles) console.log(`   partiesComestibles: ${sp.partiesComestibles}`);
    if (sp.description) console.log(`   description: ${sp.description.substring(0, 80)}...`);
    if (sp.avertissement) console.log(`   avertissement: ${sp.avertissement}`);
    console.log(`   existingPreserved: ${existingMap.has(sp.latin)}`);
    console.log();
  }
} else if (mode === '--generate') {
  console.log('\nGenerating foraging-db.ts...');
  const output = generateFile(allSpecies);
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`Written to ${OUTPUT_PATH}`);
  console.log(`File size: ${(output.length / 1024).toFixed(1)} KB`);
}
