// ============================================================
// ChampIndex — Matching essences champignons ↔ forêts
// Gère la taxonomie des arbres et le scoring de compatibilité
// ============================================================

/**
 * Termes génériques côté espèce → quelles essences de forêt les satisfont.
 * Ex: un champignon qui a besoin de "conifère" matche pin sylvestre, épicéa, etc.
 */
const ESSENCE_EXPANDS_TO: Record<string, string[]> = {
  'conifère':  ['conifère', 'pin sylvestre', 'pin maritime', 'épicéa', 'sapin', 'mélèze'],
  'chêne':     ['chêne', 'chêne vert', 'chêne truffier'],
  'pin':       ['pin sylvestre', 'pin maritime'],
};

/**
 * Côté forêt → quels besoins d'espèce ça satisfait.
 * Ex: une forêt avec "épicéa" satisfait un champignon qui demande "conifère" ou "épicéa".
 */
const FOREST_SATISFIES: Record<string, string[]> = {
  'pin sylvestre':  ['pin sylvestre', 'conifère'],
  'pin maritime':   ['pin maritime', 'conifère'],
  'épicéa':         ['épicéa', 'conifère'],
  'sapin':          ['sapin', 'conifère'],
  'mélèze':         ['mélèze', 'conifère'],
  'chêne':          ['chêne'],                    // chêne générique NE satisfait PAS "chêne truffier"
  'chêne vert':     ['chêne vert', 'chêne'],      // satisfait aussi "chêne" générique
  'chêne truffier': ['chêne truffier', 'chêne'],  // satisfait aussi "chêne" générique
};

/**
 * Habitats universels — toujours présents en forêt (lisières, clairières, etc.)
 */
const UNIVERSAL_FOREST_HABITATS = new Set([
  'lisière',
  'clairière',
  'mousse',
  'bord de chemin',
]);

/**
 * Habitats ouverts — présents en bordure de forêt mais pas au cœur
 */
const OPEN_HABITATS = new Set([
  'prairie',
  'pelouse',
  'pâturage',
  'haie',
]);

/**
 * Vérifie si un besoin d'essence d'un champignon est satisfait par les essences d'une forêt.
 */
function essenceMatches(speciesNeed: string, forestEssences: string[]): boolean {
  // Match direct
  if (forestEssences.includes(speciesNeed)) return true;

  // Expansion côté espèce : "conifère" → match si la forêt a un conifère
  const expandsTo = ESSENCE_EXPANDS_TO[speciesNeed];
  if (expandsTo && expandsTo.some(e => forestEssences.includes(e))) return true;

  // Expansion côté forêt : forêt "épicéa" → satisfait besoin "conifère"
  for (const fe of forestEssences) {
    const satisfies = FOREST_SATISFIES[fe];
    if (satisfies && satisfies.includes(speciesNeed)) return true;
  }

  return false;
}

export type EssenceMatchType = 'full' | 'partial' | 'habitat' | 'none';

/**
 * Calcule le score de compatibilité essences entre un champignon et une forêt.
 *
 * @returns score 0-100 et type de match
 *  - full (100) : au moins la moitié des essences-arbre matchent
 *  - partial (60) : au moins une essence-arbre matche
 *  - habitat (50-80) : espèce de lisière/prairie (pas d'arbre hôte spécifique)
 *  - none (0) : aucune compatibilité
 */
export function computeEssenceScore(
  speciesEssences: string[],
  forestEssences: string[],
): { score: number; matchType: EssenceMatchType } {

  // Séparer essences-arbre et essences-habitat
  const treeNeeds = speciesEssences.filter(
    e => !UNIVERSAL_FOREST_HABITATS.has(e) && !OPEN_HABITATS.has(e),
  );
  const habitatNeeds = speciesEssences.filter(
    e => UNIVERSAL_FOREST_HABITATS.has(e) || OPEN_HABITATS.has(e),
  );

  // Espèce purement "habitat" (ex: Rosé des prés → prairie, pâturage)
  if (treeNeeds.length === 0) {
    const hasUniversal = habitatNeeds.some(e => UNIVERSAL_FOREST_HABITATS.has(e));
    return {
      score: hasUniversal ? 80 : 50,  // lisière/clairière = 80%, prairie pure = 50%
      matchType: 'habitat',
    };
  }

  // Compter les matches arbre
  const matchCount = treeNeeds.filter(e => essenceMatches(e, forestEssences)).length;

  if (matchCount === 0) {
    return { score: 0, matchType: 'none' };
  }

  const ratio = matchCount / treeNeeds.length;
  if (ratio >= 0.5) {
    return { score: 100, matchType: 'full' };
  }

  return { score: 60, matchType: 'partial' };
}
