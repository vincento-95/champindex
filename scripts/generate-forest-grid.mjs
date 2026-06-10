#!/usr/bin/env node
// ============================================================
// Génération d'une grille dense de points forestiers
// Source : IGN BD Forêt® V2 — Inventaire Forestier National
// API WFS : https://data.geopf.fr/wfs/ows (Licence Ouverte Etalab v2.0)
// ============================================================

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Configuration ──
const GRID_STEP = 0.09;      // ~10km entre chaque point
const CONCURRENCY = 10;      // requêtes parallèles
const WFS_BASE = 'https://data.geopf.fr/wfs/ows';
const POINT_RADIUS = 0.01;   // ~1.1km bbox radius (petit = réponse rapide)
const WFS_COUNT = 50;         // features par requête (50 = bonne couverture d'essences)
const FETCH_TIMEOUT = 15000;  // 15s timeout
const MAX_RETRIES = 3;
const SLEEP_BETWEEN = 120;    // ms entre requêtes par worker

// Bounding box de la France métropolitaine (+ Corse)
const FRANCE_BBOX = {
  lonMin: -5.2,
  lonMax: 9.6,
  latMin: 41.3,
  latMax: 51.1,
};

// ── Mapping IGN essence → interne ──
const IGN_TO_INTERNAL = {
  'Pin maritime':            'pin maritime',
  'Pin sylvestre':           'pin sylvestre',
  'Pin laricio':             'pin sylvestre',
  'Pin laricio, pin noir':   'pin sylvestre',
  'Pin noir':                'pin sylvestre',
  'Pin à crochets':          'pin sylvestre',
  'Pin pignon, pin parasol': 'pin sylvestre',
  'Pins mélangés':           'pin sylvestre',
  "Pin d'Alep":              'pin sylvestre',
  'Epicéa commun':           'épicéa',
  'Epicéa de Sitka':         'épicéa',
  'Sapin pectiné':           'sapin',
  'Sapin, épicéa':           'BOTH_SAPIN_EPICEA',
  'Douglas':                 'sapin',
  'Mélèze':                  'mélèze',
  'Hêtre':                   'hêtre',
  'Châtaignier':             'châtaignier',
  'Chênes décidus':          'chêne',
  'Chênes sempervirents':    'chêne vert',
  'Charme':                  'charme',
  'Frêne':                   'frêne',
  'Bouleau':                 'bouleau',
  'Noisetier':               'noisetier',
  // Non-mapped (plantations, non-mycological interest, too generic)
  'Robinier':                null,
  'Aulne':                   null,
  'Peuplier':                null,
  'Erable':                  null,
  'Tilleul':                 null,
};

// Essences that indicate "conifer" forest type
const CONIFER_IGN = new Set([
  'Conifères', 'Pin maritime', 'Pin sylvestre', 'Pin laricio', 'Pin laricio, pin noir',
  'Pin noir', 'Pin à crochets', 'Pins mélangés', "Pin d'Alep", 'Pin pignon, pin parasol',
  'Epicéa commun', 'Epicéa de Sitka', 'Sapin pectiné', 'Sapin, épicéa',
  'Douglas', 'Mélèze'
]);

// Essences that indicate "deciduous" forest type
const DECIDUOUS_IGN = new Set([
  'Feuillus', 'Hêtre', 'Châtaignier', 'Chênes décidus', 'Chênes sempervirents',
  'Charme', 'Frêne', 'Bouleau', 'Robinier', 'Aulne', 'Peuplier', 'Erable',
  'Tilleul', 'Noisetier'
]);

function mapIgnEssence(ignEssence) {
  if (!ignEssence) return [];
  if (ignEssence === 'Sapin, épicéa') return ['sapin', 'épicéa'];
  const mapped = IGN_TO_INTERNAL[ignEssence];
  if (!mapped) return [];
  return [mapped];
}

// Determine forest type label from the essences found
function inferForestLabel(essenceCount, tfvValues) {
  const keys = Object.keys(essenceCount);
  const hasConifer = keys.some(k => CONIFER_IGN.has(k));
  const hasDeciduous = keys.some(k => DECIDUOUS_IGN.has(k));

  // Also check tfv values for clues
  const allTfvs = Object.keys(tfvValues).join(' ').toLowerCase();
  const tfvConifer = allTfvs.includes('conifère') || allTfvs.includes('sapin') ||
    allTfvs.includes('épicéa') || allTfvs.includes('pin ');
  const tfvDeciduous = allTfvs.includes('feuillu') || allTfvs.includes('hêtre') ||
    allTfvs.includes('chêne');

  const anyConifer = hasConifer || tfvConifer;
  const anyDeciduous = hasDeciduous || tfvDeciduous;

  if (anyConifer && anyDeciduous) return 'Forêt mixte';
  if (anyConifer) return 'Forêt de conifères';
  if (anyDeciduous) return 'Forêt de feuillus';
  return 'Forêt';
}

// Infer category marker for regional default resolution
function inferForestCategory(essenceCount, tfvValues) {
  const keys = Object.keys(essenceCount);
  const allTfvs = Object.keys(tfvValues).join(' ').toLowerCase();

  const hasConifer = keys.some(k => CONIFER_IGN.has(k)) ||
    allTfvs.includes('conifère') || allTfvs.includes('sapin') ||
    allTfvs.includes('épicéa') || allTfvs.includes('pin ');
  const hasDeciduous = keys.some(k => DECIDUOUS_IGN.has(k)) ||
    allTfvs.includes('feuillu') || allTfvs.includes('hêtre') ||
    allTfvs.includes('chêne');

  return { hasConifer, hasDeciduous };
}

// Regional default essences for generic forest categories
const REGIONAL_DEFAULTS = {
  'Nouvelle-Aquitaine':        { conifer: ['pin maritime'], deciduous: ['chêne'] },
  'Occitanie':                 { conifer: ['pin sylvestre'], deciduous: ['chêne', 'hêtre'] },
  'PACA':                      { conifer: ['pin sylvestre'], deciduous: ['chêne vert'] },
  'Auvergne-Rhône-Alpes':     { conifer: ['épicéa', 'sapin'], deciduous: ['hêtre'] },
  'Bourgogne-Franche-Comté':  { conifer: ['épicéa'], deciduous: ['chêne', 'hêtre'] },
  'Grand Est':                 { conifer: ['épicéa', 'sapin'], deciduous: ['hêtre', 'chêne'] },
  'Île-de-France':             { conifer: ['pin sylvestre'], deciduous: ['chêne', 'hêtre'] },
  'Centre-Val de Loire':       { conifer: ['pin sylvestre'], deciduous: ['chêne'] },
  'Normandie':                 { conifer: ['pin sylvestre'], deciduous: ['hêtre', 'chêne'] },
  'Bretagne':                  { conifer: ['pin maritime'], deciduous: ['chêne', 'hêtre'] },
  'Pays de la Loire':          { conifer: ['pin maritime'], deciduous: ['chêne'] },
  'Hauts-de-France':           { conifer: ['pin sylvestre'], deciduous: ['chêne', 'hêtre'] },
  'Corse':                     { conifer: ['pin maritime'], deciduous: ['chêne vert'] },
  'France':                    { conifer: ['pin sylvestre'], deciduous: ['chêne'] },
};

function inferRegionalEssences(category, region) {
  const defaults = REGIONAL_DEFAULTS[region] || REGIONAL_DEFAULTS['France'];
  const essences = new Set();

  if (category.hasConifer) {
    for (const e of defaults.conifer) essences.add(e);
  }
  if (category.hasDeciduous) {
    for (const e of defaults.deciduous) essences.add(e);
  }
  // If we know it's a forest but don't know the type, add both
  if (!category.hasConifer && !category.hasDeciduous) {
    for (const e of defaults.deciduous) essences.add(e);
  }

  return [...essences];
}

// ── Régions françaises par coordonnées (simplifié) ──
function getRegion(lat, lon) {
  if (lon >= 8.5 && lat <= 43.1) return 'Corse';
  if (lon >= 5.0 && lat <= 44.5) return 'PACA';
  if (lon < 5.0 && lat <= 43.5 && lon >= 0.0) return 'Occitanie';
  if (lon < 1.5 && lat <= 46.5 && lat > 43.5) return 'Nouvelle-Aquitaine';
  if (lon < 0.0 && lat <= 47.5) return 'Nouvelle-Aquitaine';
  if (lon < -1.0 && lat > 47.5) return 'Bretagne';
  if (lon >= -1.0 && lon < 1.5 && lat > 46.5 && lat <= 48.5) return 'Pays de la Loire';
  if (lon < 2.0 && lat > 48.5 && lat <= 50.0) return 'Normandie';
  if (lat > 49.0 && lon >= 1.5) return 'Hauts-de-France';
  if (lat >= 48.0 && lat <= 49.2 && lon >= 1.5 && lon <= 3.5) return 'Île-de-France';
  if (lat >= 46.5 && lat <= 48.5 && lon >= 1.0 && lon <= 3.5) return 'Centre-Val de Loire';
  if (lon >= 4.5 && lat > 47.5) return 'Grand Est';
  if (lon >= 2.5 && lon < 7.0 && lat >= 46.0 && lat <= 48.0) return 'Bourgogne-Franche-Comté';
  if (lon >= 2.0 && lon < 7.5 && lat >= 44.0 && lat <= 46.5) return 'Auvergne-Rhône-Alpes';
  return 'France';
}

// ── Process WFS features ──
function processFeatures(features) {
  if (!features || features.length === 0) return null;

  const essenceCount = {};
  const tfvValues = {};
  let forestFeatureCount = 0;

  for (const f of features) {
    const e = f.properties?.essence || '';
    const tfv = f.properties?.tfv || '';

    // Only count forest features (skip Lande, Formation herbacée, etc.)
    const isForestTfv = tfv.toLowerCase().includes('forêt') || tfv.toLowerCase().includes('peupleraie');
    if (!isForestTfv) continue;

    forestFeatureCount++;
    if (tfv) {
      tfvValues[tfv] = (tfvValues[tfv] || 0) + 1;
    }

    // Count essences (skip NR/NC which mean "not recorded")
    if (e && e !== 'NR' && e !== 'NC') {
      essenceCount[e] = (essenceCount[e] || 0) + 1;
    }
  }

  // No forest features at all
  if (forestFeatureCount === 0) return null;

  return { essenceCount, tfvValues, forestFeatureCount };
}

// ── Query WFS with timeout + retry ──
async function queryWFS(lat, lon) {
  const r = POINT_RADIUS;
  const bbox = `${lon - r},${lat - r},${lon + r},${lat + r},EPSG:4326`;
  const url = `${WFS_BASE}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature`
    + `&TYPENAME=LANDCOVER.FORESTINVENTORY.V2:formation_vegetale`
    + `&OUTPUTFORMAT=application/json`
    + `&SRSNAME=EPSG:4326`
    + `&PROPERTYNAME=essence,tfv`
    + `&BBOX=${bbox}`
    + `&COUNT=${WFS_COUNT}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        if ((resp.status === 429 || resp.status === 503) && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        return { __error__: `HTTP ${resp.status}` };
      }

      const data = await resp.json();
      const result = processFeatures(data.features);
      if (result === null) return null; // no forest

      const { essenceCount, tfvValues } = result;

      // Map IGN essences to internal essences
      const internalEssences = new Set();
      for (const ignE of Object.keys(essenceCount)) {
        for (const mapped of mapIgnEssence(ignE)) {
          internalEssences.add(mapped);
        }
      }
      let essences = [...internalEssences];

      // Determine forest category from ALL data (essences + tfv)
      const category = inferForestCategory(essenceCount, tfvValues);

      // If no specific essences mapped, use regional defaults
      // (this covers Feuillus/Conifères/Mixte/NR-only cases)
      const hasSpecificEssences = essences.length > 0;

      // Build name
      let name;
      if (essences.length > 0) {
        name = essences.length <= 2 ? essences.join(' / ') : inferForestLabel(essenceCount, tfvValues);
      } else {
        name = inferForestLabel(essenceCount, tfvValues);
      }
      name = name.charAt(0).toUpperCase() + name.slice(1);

      return {
        essences,
        name,
        ignEssences: essenceCount,
        category,
        hasSpecificEssences,
      };

    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      return { __error__: err.name === 'AbortError' ? 'timeout' : err.message };
    }
  }
  return { __error__: 'max retries' };
}

// ── Helpers ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array(Math.min(concurrency, tasks.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}

// ── Main ──
async function main() {
  console.log('🌲 Génération de la grille forestière dense');
  console.log('   Source : IGN BD Forêt® V2 — Inventaire Forestier National');
  console.log('━'.repeat(60));

  // Generate grid points
  const gridPoints = [];
  for (let lat = FRANCE_BBOX.latMin; lat <= FRANCE_BBOX.latMax; lat += GRID_STEP) {
    for (let lon = FRANCE_BBOX.lonMin; lon <= FRANCE_BBOX.lonMax; lon += GRID_STEP) {
      // Skip obvious non-France areas
      if (lon < -4.5 && lat > 48.5) continue;
      if (lat > 51.2) continue;
      if (lat < 42.0 && lon > 3.2 && lon < 8.5) continue;
      if (lon > 7.0 && lon < 8.4 && lat < 42.5) continue;

      gridPoints.push({ lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000 });
    }
  }

  console.log(`📍 ${gridPoints.length} points dans la grille (pas = ${GRID_STEP}° ≈ ${Math.round(GRID_STEP * 111)}km)`);
  console.log(`   Bbox par point : ${POINT_RADIUS}° ≈ ${Math.round(POINT_RADIUS * 111 * 1000)}m, COUNT=${WFS_COUNT}`);
  console.log(`   Concurrency=${CONCURRENCY}, timeout=${FETCH_TIMEOUT}ms, retries=${MAX_RETRIES}`);

  // Query WFS for each point
  const forestPoints = [];
  let queried = 0;
  let found = 0;
  let errors = 0;
  let noForest = 0;
  const errorTypes = {};

  const startTime = Date.now();

  const tasks = gridPoints.map((gp) => async () => {
    queried++;
    if (queried % 50 === 0 || queried === gridPoints.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = (queried / (Date.now() - startTime) * 1000).toFixed(1);
      process.stdout.write(`\r  [${queried}/${gridPoints.length}] → ${found} forêts, ${errors} err, ${noForest} vide | ${rate} req/s | ${elapsed}s`);
    }

    const result = await queryWFS(gp.lat, gp.lon);

    if (result === null) {
      noForest++;
    } else if (result?.__error__) {
      errors++;
      const errKey = result.__error__;
      errorTypes[errKey] = (errorTypes[errKey] || 0) + 1;
    } else {
      found++;
      const region = getRegion(gp.lat, gp.lon);
      let essences = result.essences;

      // If no specific essences, infer from region + category
      if (essences.length === 0) {
        essences = inferRegionalEssences(result.category, region);
      }

      forestPoints.push({
        lat: gp.lat,
        lon: gp.lon,
        region,
        essences,
        name: result.name,
      });
    }

    await sleep(SLEEP_BETWEEN);
  });

  await runWithConcurrency(tasks, CONCURRENCY);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ ${forestPoints.length} points forestiers trouvés sur ${gridPoints.length} points testés (${totalTime}s)`);
  console.log(`   Forêts : ${found} | Sans forêt : ${noForest} | Erreurs : ${errors}`);
  console.log(`   Taux de couverture : ${(found / gridPoints.length * 100).toFixed(1)}%`);

  if (Object.keys(errorTypes).length > 0) {
    console.log('\n⚠️  Types d\'erreurs :');
    for (const [type, count] of Object.entries(errorTypes).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${type.padEnd(30)} ${count}`);
    }
  }

  // Sort by region then lat/lon
  forestPoints.sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    if (a.lat !== b.lat) return b.lat - a.lat;
    return a.lon - b.lon;
  });

  // Generate TypeScript file
  const lines = [
    '// ============================================================',
    '// ChampIndex — Points forestiers générés depuis IGN BD Forêt® V2',
    '// Inventaire Forestier National — Licence Ouverte Etalab v2.0',
    '// API WFS : https://data.geopf.fr/wfs/ows',
    '//',
    `// Généré le ${new Date().toISOString().split('T')[0]}`,
    `// ${forestPoints.length} points forestiers — grille ${Math.round(GRID_STEP * 111)}km`,
    '// ============================================================',
    '',
    'export interface ForestPoint {',
    '  id: number;',
    '  name: string;',
    '  lat: number;',
    '  lon: number;',
    '  region: string;',
    '  essences: string[];',
    '}',
    '',
    'export const FOREST_POINTS: ForestPoint[] = [',
  ];

  let currentRegion = '';
  forestPoints.forEach((fp, i) => {
    if (fp.region !== currentRegion) {
      currentRegion = fp.region;
      lines.push(`  // ═══════ ${currentRegion.toUpperCase()} ═══════`);
    }

    const essStr = fp.essences.length > 0
      ? `[${fp.essences.map(e => `'${e}'`).join(', ')}]`
      : '[]';
    const name = fp.name.replace(/'/g, "\\'");
    lines.push(`  { id: ${i + 1}, name: '${name}', lat: ${fp.lat}, lon: ${fp.lon}, region: '${fp.region}', essences: ${essStr} },`);
  });

  lines.push('];');
  lines.push('');

  const outputPath = join(__dirname, '..', 'src', 'data', 'forest-points.ts');
  writeFileSync(outputPath, lines.join('\n'), 'utf8');

  console.log(`\n📁 Écrit dans : src/data/forest-points.ts`);
  console.log(`   ${forestPoints.length} points, ${lines.length} lignes`);

  // Stats par région
  console.log('\n📊 Répartition par région :');
  const regionCount = {};
  for (const fp of forestPoints) {
    regionCount[fp.region] = (regionCount[fp.region] || 0) + 1;
  }
  for (const [region, count] of Object.entries(regionCount).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${region.padEnd(30)} ${count}`);
  }

  // Stats par essence
  console.log('\n🌳 Top essences :');
  const essenceCountFinal = {};
  for (const fp of forestPoints) {
    for (const e of fp.essences) {
      essenceCountFinal[e] = (essenceCountFinal[e] || 0) + 1;
    }
  }
  for (const [essence, count] of Object.entries(essenceCountFinal).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`   ${essence.padEnd(20)} ${count}`);
  }

  const withSpecific = forestPoints.filter(fp => fp.essences.length > 0 && fp.name !== 'Forêt' && !fp.name.startsWith('Forêt de') && !fp.name.startsWith('Forêt mixte')).length;
  const withRegional = forestPoints.filter(fp => fp.name.startsWith('Forêt de') || fp.name.startsWith('Forêt mixte') || fp.name === 'Forêt').length;
  console.log(`\n📊 ${withSpecific} points avec essences IGN spécifiques, ${withRegional} avec essences régionales par défaut`);
}

main().catch(console.error);
