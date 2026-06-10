// ============================================================
// Renomme les fichiers public/zones/*.json pour matcher les ids
// de locations-db.ts. Les fichiers avaient été générés avec un
// slug non-translittéré ('Forêt' → 'for-t') alors que l'app les
// charge par id translittéré ('foret-…') → 404 silencieux.
// Usage : node scripts/rename-zones.mjs
// ============================================================

import { readFileSync, existsSync, renameSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const zonesDir = join(root, 'public', 'zones');
const dbSource = readFileSync(join(root, 'src', 'lib', 'locations-db.ts'), 'utf8');

// Extraire les paires id/name
const entryRe = /id:\s*'([^']+)',\s*\n\s*name:\s*'((?:[^'\\]|\\.)*)'/g;
const pairs = [];
let m;
while ((m = entryRe.exec(dbSource)) !== null) {
  pairs.push({ id: m[1], name: m[2].replace(/\\'/g, "'") });
}
console.log(`${pairs.length} lieux trouvés dans locations-db.ts`);

// Ancien slug = celui de scripts/fetch-forest-polygons.html (sans translittération)
const oldSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

let renamed = 0, already = 0, missing = 0;
for (const { id, name } of pairs) {
  const target = join(zonesDir, `${id}.json`);
  if (existsSync(target)) { already++; continue; }
  const candidate = join(zonesDir, `${oldSlug(name)}.json`);
  if (existsSync(candidate)) {
    renameSync(candidate, target);
    renamed++;
  } else {
    missing++;
  }
}

console.log(`Renommés : ${renamed} · Déjà corrects : ${already} · Sans fichier : ${missing}`);
const orphans = readdirSync(zonesDir).filter(f => f.endsWith('.json') && !pairs.some(p => f === `${p.id}.json`));
console.log(`Orphelins restants : ${orphans.length}${orphans.length ? ' → ' + orphans.join(', ') : ''}`);
