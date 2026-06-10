#!/usr/bin/env node
// ============================================================
// Validation des essences forestières via BD Forêt V2 (IGN)
// Source officielle : Inventaire Forestier National
// API WFS : https://data.geopf.fr/wfs/ows
// Licence Ouverte Etalab v2.0
// ============================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Mapping BD Forêt essence → nos catégories internes ──
const IGN_TO_INTERNAL = {
  'Pin maritime':            ['pin maritime'],
  'Pin sylvestre':           ['pin sylvestre'],
  'Pin laricio':             ['pin sylvestre'],      // mapped to pin sylvestre in our system
  'Pin noir':                ['pin sylvestre'],
  'Pin à crochets':          ['pin sylvestre'],
  'Pins mélangés':           ['pin sylvestre'],
  'Epicéa commun':           ['épicéa'],
  'Epicéa de Sitka':         ['épicéa'],
  'Sapin pectiné':           ['sapin'],
  'Mélèze':                  ['mélèze'],
  'Douglas':                 ['sapin'],              // conifer, closest match
  'Hêtre':                   ['hêtre'],
  'Châtaignier':             ['châtaignier'],
  'Chênes décidus':          ['chêne'],
  'Chênes sempervirents':    ['chêne vert'],
  'Charme':                  ['charme'],
  'Frêne':                   ['frêne'],
  'Bouleau':                 ['bouleau'],
  'Robinier':                [],                     // no match needed
  'Aulne':                   [],
  'Peuplier':                [],
  'Erable':                  [],
  'Tilleul':                 [],
  // Generic categories
  'Conifères':               ['__conifère__'],       // any conifer satisfies
  'Feuillus':                ['__feuillu__'],         // any deciduous satisfies
  'NC':                      [],
  'NR':                      [],
  'Mixte':                   [],
};

// Our essences classified
const CONIFERES = new Set(['pin sylvestre', 'pin maritime', 'épicéa', 'sapin', 'mélèze']);
const FEUILLUS = new Set(['chêne', 'chêne vert', 'chêne truffier', 'hêtre', 'charme', 'châtaignier', 'frêne', 'bouleau', 'noisetier']);

// ── Read forest points from source ──
function extractForestPoints() {
  const src = readFileSync(join(__dirname, '..', 'src', 'data', 'forest-points.ts'), 'utf8');
  const points = [];
  const regex = /\{\s*id:\s*(\d+),\s*name:\s*'([^']*(?:\\'[^']*)*)',\s*lat:\s*([\d.]+),\s*lon:\s*([\d.-]+),\s*region:\s*'([^']*)'/g;
  let m;
  while ((m = regex.exec(src)) !== null) {
    points.push({
      id: parseInt(m[1]),
      name: m[2].replace(/\\'/g, "'"),
      lat: parseFloat(m[3]),
      lon: parseFloat(m[4]),
      region: m[5],
    });
  }
  return points;
}

// ── Read our essences from source ──
function extractOurEssences() {
  const src = readFileSync(join(__dirname, '..', 'src', 'data', 'forest-essences.ts'), 'utf8');
  const essences = {};
  // Match both single-quoted and double-quoted keys
  const regex = /(?:'([^']*(?:\\'[^']*)*)'|"([^"]*)")\s*:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = regex.exec(src)) !== null) {
    if (src.lastIndexOf('REGIONAL_ESSENCES', m.index) > src.lastIndexOf('NAMED_FORESTS', m.index)) continue;
    if (src.lastIndexOf('NAME_PATTERNS', m.index) > src.lastIndexOf('NAMED_FORESTS', m.index)) continue;
    const name = (m[1] || m[2]).replace(/\\'/g, "'");
    const values = m[3].match(/'([^']*)'/g)?.map(s => s.replace(/'/g, '')) || [];
    essences[name] = values;
  }
  return essences;
}

// ── Query WFS for a single point ──
async function queryWFS(lat, lon, radius = 0.005) {
  const bbox = `${lon - radius},${lat - radius},${lon + radius},${lat + radius},EPSG:4326`;
  const url = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=LANDCOVER.FORESTINVENTORY.V2:formation_vegetale&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&BBOX=${bbox}&COUNT=50`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const essences = {};
    for (const f of data.features || []) {
      const e = f.properties?.essence;
      if (e && e !== 'NR' && e !== 'NC') {
        essences[e] = (essences[e] || 0) + 1;
      }
    }
    return essences;
  } catch (err) {
    return { __error__: err.message };
  }
}

// ── Compare IGN essences with our data ──
function compareEssences(ignEssences, ourEssences) {
  const issues = [];

  // Convert IGN essences to our internal format
  const ignInternal = new Set();
  let hasConifer = false;
  let hasDeciduous = false;

  for (const [ignName, count] of Object.entries(ignEssences)) {
    const mapped = IGN_TO_INTERNAL[ignName] || [];
    for (const m of mapped) {
      if (m === '__conifère__') hasConifer = true;
      else if (m === '__feuillu__') hasDeciduous = true;
      else ignInternal.add(m);
    }
  }

  // Check: do we claim conifers but IGN says only deciduous?
  const ourHasConifer = ourEssences.some(e => CONIFERES.has(e));
  const ourHasDeciduous = ourEssences.some(e => FEUILLUS.has(e));
  const ourOnlyConifer = ourHasConifer && !ourHasDeciduous;
  const ourOnlyDeciduous = ourHasDeciduous && !ourHasConifer;

  // If IGN gives specific species, check for matches
  if (ignInternal.size > 0) {
    // Check if IGN has species we don't list
    for (const ign of ignInternal) {
      if (!ourEssences.includes(ign)) {
        issues.push({ type: 'missing', essence: ign, msg: `IGN indique "${ign}" mais absent de nos données` });
      }
    }
    // Check if we claim species IGN doesn't show
    for (const our of ourEssences) {
      const isInIgn = ignInternal.has(our);
      const coveredByGeneric = (CONIFERES.has(our) && hasConifer) || (FEUILLUS.has(our) && hasDeciduous);
      if (!isInIgn && !coveredByGeneric) {
        // Soft warning - IGN might just not be precise enough
        issues.push({ type: 'unconfirmed', essence: our, msg: `"${our}" dans nos données mais non confirmé par IGN` });
      }
    }
  }

  // Category mismatch checks
  const ignOnlyDeciduous = !hasConifer && Object.keys(ignEssences).every(k => {
    const mapped = IGN_TO_INTERNAL[k] || [];
    return !mapped.some(m => m === '__conifère__') && !mapped.some(m => CONIFERES.has(m));
  }) && (Object.keys(ignEssences).some(k => {
    const mapped = IGN_TO_INTERNAL[k] || [];
    return mapped.some(m => m === '__feuillu__') || mapped.some(m => FEUILLUS.has(m));
  }));

  const ignOnlyConifer = !hasDeciduous && Object.keys(ignEssences).every(k => {
    const mapped = IGN_TO_INTERNAL[k] || [];
    return !mapped.some(m => m === '__feuillu__') && !mapped.some(m => FEUILLUS.has(m));
  }) && (Object.keys(ignEssences).some(k => {
    const mapped = IGN_TO_INTERNAL[k] || [];
    return mapped.some(m => m === '__conifère__') || mapped.some(m => CONIFERES.has(m));
  }));

  if (ourOnlyConifer && ignOnlyDeciduous) {
    issues.push({ type: 'category_mismatch', msg: '⚠️ Nos données = conifères uniquement, IGN = feuillus uniquement' });
  }
  if (ourOnlyDeciduous && ignOnlyConifer) {
    issues.push({ type: 'category_mismatch', msg: '⚠️ Nos données = feuillus uniquement, IGN = conifères uniquement' });
  }

  return issues;
}

// ── Sleep helper ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──
async function main() {
  console.log('🌲 Validation des essences forestières via BD Forêt V2 (IGN)');
  console.log('━'.repeat(60));

  const points = extractForestPoints();
  const ourEssences = extractOurEssences();

  console.log(`📍 ${points.length} points forestiers trouvés`);
  console.log(`🌳 ${Object.keys(ourEssences).length} forêts avec essences définies`);
  console.log('');

  // Get one representative point per unique forest name
  const uniqueForests = new Map();
  for (const p of points) {
    if (!uniqueForests.has(p.name)) {
      uniqueForests.set(p.name, p);
    }
  }

  console.log(`🔍 ${uniqueForests.size} forêts uniques à vérifier`);
  console.log('');

  const results = [];
  let checked = 0;
  let errors = 0;
  let warnings = 0;
  let confirmed = 0;

  for (const [name, point] of uniqueForests) {
    checked++;
    process.stdout.write(`\r  [${checked}/${uniqueForests.size}] ${name.padEnd(40)}`);

    const ignEssences = await queryWFS(point.lat, point.lon);

    if (ignEssences.__error__) {
      results.push({ name, status: 'error', msg: ignEssences.__error__ });
      errors++;
      await sleep(500);
      continue;
    }

    if (Object.keys(ignEssences).length === 0) {
      results.push({ name, status: 'no_data', msg: 'Aucune donnée IGN à cet emplacement' });
      await sleep(200);
      continue;
    }

    const our = ourEssences[name];
    if (!our) {
      results.push({ name, status: 'no_local', msg: 'Pas dans notre base NAMED_FORESTS' });
      await sleep(200);
      continue;
    }

    const issues = compareEssences(ignEssences, our);
    const categoryMismatch = issues.some(i => i.type === 'category_mismatch');
    const missing = issues.filter(i => i.type === 'missing');

    if (categoryMismatch) {
      errors++;
      results.push({ name, status: 'MISMATCH', issues, ign: ignEssences, our });
    } else if (missing.length > 0) {
      warnings++;
      results.push({ name, status: 'warning', issues, ign: ignEssences, our });
    } else {
      confirmed++;
      results.push({ name, status: 'ok', ign: ignEssences, our });
    }

    // Rate limiting: 200ms between requests
    await sleep(200);
  }

  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 RÉSULTATS DE VALIDATION');
  console.log('═'.repeat(60));
  console.log(`✅ Confirmées : ${confirmed}`);
  console.log(`⚠️  Avertissements : ${warnings}`);
  console.log(`❌ Incohérences : ${errors}`);
  console.log(`📭 Sans données IGN : ${results.filter(r => r.status === 'no_data').length}`);
  console.log(`🔧 Erreurs API : ${results.filter(r => r.status === 'error').length}`);
  console.log('');

  // Print mismatches
  const mismatches = results.filter(r => r.status === 'MISMATCH');
  if (mismatches.length > 0) {
    console.log('━'.repeat(60));
    console.log('❌ INCOHÉRENCES (catégorie feuillus/conifères inversée) :');
    console.log('━'.repeat(60));
    for (const r of mismatches) {
      console.log(`\n  🌲 ${r.name}`);
      console.log(`     Nos données : [${r.our.join(', ')}]`);
      console.log(`     IGN BD Forêt : ${JSON.stringify(r.ign)}`);
      for (const i of r.issues) {
        console.log(`     → ${i.msg}`);
      }
    }
  }

  // Print warnings (missing species)
  const warns = results.filter(r => r.status === 'warning');
  if (warns.length > 0) {
    console.log('\n' + '━'.repeat(60));
    console.log('⚠️  ESSENCES IGN ABSENTES DE NOS DONNÉES :');
    console.log('━'.repeat(60));
    for (const r of warns) {
      const missingOnly = r.issues.filter(i => i.type === 'missing');
      if (missingOnly.length > 0) {
        console.log(`\n  🌲 ${r.name}`);
        console.log(`     Nos données : [${r.our.join(', ')}]`);
        console.log(`     IGN BD Forêt : ${JSON.stringify(r.ign)}`);
        for (const i of missingOnly) {
          console.log(`     → ${i.msg}`);
        }
      }
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('Source : IGN BD Forêt® V2 — Inventaire Forestier National');
  console.log('Licence Ouverte Etalab v2.0');
  console.log('API WFS : https://data.geopf.fr/wfs/ows');
  console.log('━'.repeat(60));
}

main().catch(console.error);
