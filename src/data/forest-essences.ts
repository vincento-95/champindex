// ============================================================
// ChampIndex — Essences forestières de France
// Résolution à 3 niveaux : nom exact → heuristique nom → région
//
// Sources :
//   • IGN BD Forêt® V2 — Inventaire Forestier National
//     API WFS : https://data.geopf.fr/wfs/ows
//     Couche : LANDCOVER.FORESTINVENTORY.V2:formation_vegetale
//     Licence Ouverte Etalab v2.0
//   • ONF — Plans de gestion forestière par massif
//   • Agents de recherche — vérification web croisée (mars 2026)
//
// Validation automatique : scripts/validate-essences-ign.mjs
// Dernière validation : 2026-03-13 (176/220 confirmées, 18 corrigées)
// ============================================================

/**
 * TIER 1 — Forêts documentées (essences dominantes vérifiées IGN + ONF)
 * Clé = nom exact tel qu'il apparaît dans forest-points.ts
 */
const NAMED_FORESTS: Record<string, string[]> = {
  // ── Île-de-France ──
  'Forêt de Fontainebleau':      ['chêne', 'pin sylvestre', 'hêtre', 'charme', 'bouleau'],
  'Forêt de Fontainebleau Sud':  ['chêne', 'pin sylvestre', 'hêtre', 'bouleau'],
  'Forêt de Fontainebleau Est':  ['chêne', 'pin sylvestre', 'hêtre', 'charme'],
  'Forêt de Rambouillet':        ['chêne', 'hêtre', 'charme', 'châtaignier'],
  'Forêt de Sénart':             ['chêne', 'châtaignier', 'charme'],
  'Forêt de Montmorency':        ['châtaignier', 'chêne', 'charme'],
  'Forêt de Saint-Germain':      ['chêne', 'hêtre', 'charme', 'pin sylvestre'],
  'Forêt de Marly':              ['chêne', 'hêtre', 'charme'],
  'Forêt de Chantilly':          ['chêne', 'hêtre', 'charme', 'pin sylvestre'],
  'Forêt de Halatte':            ['chêne', 'hêtre', 'charme'],

  // ── Hauts-de-France ──
  'Forêt de Compiègne':          ['chêne', 'hêtre', 'charme', 'frêne', 'pin sylvestre'],
  'Forêt de Laigue':             ['chêne', 'hêtre', 'charme', 'frêne'],
  'Forêt de Saint-Gobain':       ['chêne', 'hêtre', 'charme'],
  'Forêt de Retz':               ['chêne', 'hêtre', 'charme'],
  'Forêt de Mormal':             ['chêne', 'hêtre', 'charme', 'frêne'],
  'Forêt de Crécy':              ['chêne', 'hêtre', 'charme'],

  // ── Grand Est / Vosges ──
  'Vosges — Gérardmer':          ['épicéa', 'sapin', 'hêtre', 'pin sylvestre'],
  'Vosges — La Bresse':          ['épicéa', 'sapin', 'hêtre'],
  'Vosges — Donon':              ['sapin', 'épicéa', 'hêtre', 'pin sylvestre'],
  'Vosges — Markstein':          ['hêtre', 'sapin', 'épicéa'],
  'Vosges — Hohwald':            ['sapin', 'hêtre', 'épicéa', 'pin sylvestre', 'châtaignier'], // IGN: châtaignier confirmé
  'Vosges — Ventron':            ['épicéa', 'sapin', 'hêtre'],
  'Forêt de Haguenau':           ['pin sylvestre', 'chêne', 'hêtre'],
  'Forêt de Bitche':             ['pin sylvestre', 'hêtre', 'chêne', 'sapin'],    // IGN: sapin/épicéa confirmé
  'Forêt de la Petite Pierre':   ['hêtre', 'chêne', 'pin sylvestre', 'sapin'],
  'Forêt de Verdun':             ['hêtre', 'chêne', 'charme', 'frêne'],
  'Forêt de Darney':             ['chêne', 'hêtre', 'charme'],
  'Forêt de Reims':              ['chêne', 'hêtre', 'charme'],

  // ── Bourgogne-Franche-Comté / Jura ──
  'Forêt du Morvan':             ['hêtre', 'chêne', 'épicéa', 'pin sylvestre'],
  'Forêt de Châtillon':          ['chêne', 'hêtre', 'charme'],
  'Jura — Les Rousses':          ['épicéa', 'sapin', 'hêtre'],
  'Forêt de Chaux':              ['chêne', 'hêtre', 'charme'],
  'Forêt de la Joux':            ['épicéa', 'sapin', 'hêtre'],
  'Forêt de Pontarlier':         ['épicéa', 'sapin', 'hêtre'],
  'Forêt de Cîteaux':            ['chêne', 'charme', 'hêtre'],
  'Forêt de Levier':             ['épicéa', 'sapin', 'hêtre'],
  'Haut-Jura — Morez':           ['épicéa', 'sapin', 'hêtre'],

  // ── Auvergne-Rhône-Alpes ──
  'Forêt de Tronçais':           ['chêne', 'hêtre', 'charme'],
  'Forêt de Tronçais Nord':      ['chêne', 'hêtre', 'charme'],
  'Forêt de Chartreuse':         ['hêtre', 'sapin', 'épicéa'],
  'Forêt du Vercors':            ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'],
  'Massif du Pilat':             ['sapin', 'hêtre', 'épicéa', 'pin sylvestre'],
  'Forêt du Beaufortain':        ['épicéa', 'sapin', 'mélèze', 'hêtre'],          // IGN: feuillus + sapin/épicéa
  'Forêt de la Vanoise':         ['épicéa', 'sapin', 'mélèze', 'pin sylvestre'],
  'Monts du Livradois':          ['sapin', 'hêtre', 'épicéa', 'pin sylvestre'],   // IGN: pin sylvestre confirmé
  'Monts du Forez':              ['sapin', 'hêtre', 'épicéa', 'pin sylvestre'],
  'Forêt des Bauges':            ['hêtre', 'sapin', 'épicéa'],
  'Forêt du Bugey':              ['hêtre', 'chêne', 'sapin'],
  'Forêt de Belledonne':         ['épicéa', 'sapin', 'hêtre', 'pin sylvestre'],
  'Massif Central — Cantal':     ['hêtre', 'sapin', 'épicéa', 'chêne'],
  'Montagne Bourbonnaise':       ['hêtre', 'sapin', 'chêne'],
  'Forêt du Sancy':              ['hêtre', 'sapin', 'épicéa'],
  'Forêt de Margeride':          ['pin sylvestre', 'hêtre', 'épicéa'],
  'Forêt des Combrailles':       ['chêne', 'hêtre', 'châtaignier'],

  // ── Nouvelle-Aquitaine ──
  'Forêt des Landes':            ['pin maritime', 'chêne'],                       // IGN: chêne en présence minoritaire
  'Forêt des Landes — Arcachon': ['pin maritime'],
  'Forêt des Landes — Mimizan':  ['pin maritime'],
  'Forêt des Landes — Labouheyre': ['pin maritime'],
  'Dordogne — Périgord':         ['chêne', 'châtaignier', 'noisetier'],
  'Dordogne — Périgord Noir':    ['chêne truffier', 'chêne vert', 'noisetier', 'charme', 'châtaignier'], // IGN: châtaignier confirmé
  'Forêt de la Double':          ['chêne', 'pin maritime', 'châtaignier'],
  'Forêt de Horte':              ['chêne', 'hêtre', 'charme'],
  'Forêt du Limousin':           ['chêne', 'hêtre', 'châtaignier', 'pin sylvestre'], // IGN: pin sylvestre confirmé
  'Forêt de Vassivière':         ['hêtre', 'épicéa', 'chêne', 'pin sylvestre'],   // IGN: pin sylvestre confirmé
  'Forêt de Châlus':             ['chêne', 'châtaignier', 'hêtre'],
  'Forêt de Mervent':            ['chêne', 'hêtre', 'charme'],
  'Forêt de Braconne':           ['chêne', 'hêtre', 'châtaignier'],
  'Plateau de Millevaches':      ['hêtre', 'épicéa', 'pin sylvestre'],
  'Forêt de Belvès':             ['chêne', 'châtaignier', 'pin sylvestre'],
  'Forêt de Buzet':              ['chêne', 'pin maritime'],
  'Forêt de Chizé':              ['chêne', 'hêtre', 'charme', 'frêne'],
  'Forêt de la Coubre':          ['pin maritime', 'chêne vert'],

  // ── Occitanie / Pyrénées ──
  'Cévennes':                    ['châtaignier', 'chêne', 'hêtre', 'pin sylvestre'],
  'Montagne Noire':              ['hêtre', 'sapin', 'chêne', 'épicéa'],
  'Forêt de Grésigne':           ['chêne', 'hêtre', 'charme'],
  'Pyrénées — Iraty':            ['hêtre', 'sapin', 'chêne'],
  'Pyrénées — Luchon':           ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'],
  'Pyrénées — Néouvielle':       ['sapin', 'hêtre', 'pin sylvestre'],
  'Pyrénées — Cauterets':        ['hêtre', 'sapin', 'épicéa'],
  'Pyrénées — Canigou':          ['hêtre', 'sapin', 'pin sylvestre', 'chêne vert'],
  'Pyrénées — Font-Romeu':       ['pin sylvestre', 'sapin', 'épicéa'],
  'Pyrénées — Ossau':            ['hêtre', 'sapin', 'épicéa'],
  'Pyrénées ariégeoises':        ['hêtre', 'sapin', 'chêne'],
  'Forêt du Sidobre':            ['chêne', 'châtaignier', 'hêtre'],
  'Forêt de Lacaune':            ['hêtre', 'sapin', 'épicéa'],
  'Forêt des Corbières':         ['chêne vert', 'pin sylvestre', 'chêne'],
  'Forêt de Bouconne':           ['chêne', 'charme', 'pin sylvestre'],

  // ── PACA ──
  'Massif des Maures':           ['chêne vert', 'châtaignier', 'pin maritime'],
  'Forêt du Luberon':            ['chêne vert', 'pin sylvestre', 'chêne'],
  'Forêt de Sainte-Baume':       ['hêtre', 'chêne vert', 'chêne', 'pin sylvestre'], // IGN: pin sylvestre + pin d'Alep
  'Forêt du Mercantour':         ['mélèze', 'épicéa', 'sapin', 'pin sylvestre'],
  'Forêt du Queyras':            ['mélèze', 'pin sylvestre', 'épicéa'],
  'Forêt du Ventoux':            ['hêtre', 'sapin', 'chêne vert', 'pin sylvestre'],
  'Forêt de la Sainte-Victoire': ['chêne vert', 'pin sylvestre', 'chêne'],
  'Forêt de Boscodon':           ['sapin', 'hêtre', 'mélèze'],
  'Forêt de Lure':               ['hêtre', 'sapin', 'chêne vert'],
  'Forêt de Valbonne':           ['chêne vert', 'pin sylvestre', 'chêne'],
  'Forêt du Verdon':             ['chêne vert', 'pin sylvestre', 'hêtre', 'chêne'], // IGN: chênes décidus confirmés
  'Alpes — Briançonnais':        ['mélèze', 'pin sylvestre', 'épicéa'],

  // ── Bretagne ──
  'Forêt de Brocéliande':        ['chêne', 'hêtre', 'châtaignier', 'pin sylvestre'],
  'Forêt de Huelgoat':           ['chêne', 'hêtre', 'pin sylvestre'],
  'Forêt de Quénécan':           ['hêtre', 'chêne', 'pin sylvestre'],
  'Forêt de Fougères':           ['hêtre', 'chêne', 'pin sylvestre'],
  'Forêt du Cranou':             ['hêtre', 'chêne', 'pin sylvestre'],

  // ── Normandie ──
  'Forêt de Lyons':              ['hêtre', 'chêne', 'charme'],
  'Forêt de Brotonne':           ['chêne', 'hêtre', 'pin sylvestre'],
  'Forêt de Roumare':            ['chêne', 'hêtre', 'charme'],
  'Forêt du Perche':             ['chêne', 'hêtre', 'charme'],
  'Forêt de Bellême':            ['chêne', 'hêtre', 'charme', 'pin sylvestre'],
  'Forêt de Cerisy':             ['hêtre', 'chêne', 'charme'],

  // ── Centre-Val de Loire ──
  'Sologne':                     ['chêne', 'pin sylvestre', 'châtaignier', 'bouleau'],
  'Forêt de Bercé':              ['chêne', 'hêtre', 'pin sylvestre'],
  'Forêt de Chambord':           ['chêne', 'pin sylvestre', 'charme'],
  'Forêt de Chinon':             ['chêne', 'pin sylvestre', 'châtaignier', 'pin maritime'], // IGN: pin maritime confirmé
  'Forêt de Loches':             ['chêne', 'charme', 'hêtre'],
  'Forêt de Blois':              ['chêne', 'pin sylvestre', 'charme'],
  'Forêt de Vierzon':            ['chêne', 'charme', 'châtaignier'],
  'Forêt de Marchenoir':         ['chêne', 'charme', 'hêtre'],
  'Forêt de Dreux':              ['chêne', 'hêtre', 'charme'],
  'Forêt de Senonches':          ['chêne', 'hêtre', 'pin sylvestre'],
  'Forêt de Montargis':          ['chêne', 'charme', 'hêtre'],

  // ── Corse ──
  'Forêt de Vizzavona':          ['pin sylvestre', 'hêtre', 'sapin'],  // pin laricio → pin sylvestre
  'Forêt de Bavella':            ['pin sylvestre', 'hêtre'],
  'Forêt de Valdoniello':        ['pin sylvestre', 'hêtre', 'sapin'],
  'Forêt de Tartagine':          ['pin sylvestre', 'hêtre', 'sapin', 'chêne vert'],  // IGN: chêne vert confirmé
  'Forêt de Bonifatu':           ['pin sylvestre', 'chêne vert', 'pin maritime'],    // IGN: pin maritime confirmé
  'Forêt de Rospa-Sorba':        ['hêtre', 'pin sylvestre', 'sapin', 'chêne vert'], // IGN: chêne vert confirmé

  // ── Compléments Île-de-France ──
  "Forêt d'Ermenonville":          ['chêne', 'pin sylvestre', 'hêtre', 'bouleau'],
  "Forêt d'Armainvilliers":        ['chêne', 'charme', 'bouleau'],
  'Forêt de Ferrières':            ['chêne', 'châtaignier', 'frêne'],
  'Forêt de Verrières':            ['chêne', 'châtaignier', 'charme', 'bouleau'],
  'Forêt de Dourdan':              ['chêne', 'châtaignier', 'hêtre', 'charme', 'pin sylvestre'], // IGN: pin sylvestre confirmé
  'Forêt de Villefermoy':          ['chêne', 'charme', 'hêtre', 'châtaignier'],  // ONF: 79% chêne
  'Forêt de Crécy-en-Brie':        ['hêtre', 'chêne'],                          // 60% hêtre, 20% chêne
  'Forêt de Marne':                ['chêne', 'frêne', 'charme'],

  // ── Compléments Hauts-de-France ──
  'Forêt de Thiérache':            ['chêne', 'hêtre', 'charme', 'frêne'],
  'Forêt du Nouvion':              ['chêne', 'hêtre', 'charme', 'frêne'],

  // ── Compléments Grand Est ──
  'Forêt de la Hardt':             ['chêne', 'charme', 'pin sylvestre'],
  'Forêt de Bar-le-Duc':           ['hêtre', 'chêne', 'charme'],
  'Forêt de Moyeuvre':             ['chêne', 'hêtre', 'charme'],
  'Forêt de Sarrebourg':           ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'],  // ONF Saint-Quirin: hêtre 34%, sapin 20%, épicéa 17%
  'Forêt de Senones':              ['sapin', 'hêtre', 'épicéa'],                  // hêtraie-sapinière vosgienne
  'Forêt du Champ du Feu':         ['sapin', 'épicéa', 'hêtre'],
  'Forêt de Gérardmer Nord':       ['sapin', 'épicéa', 'hêtre'],                  // ONF hêtraie-sapinière/pessière
  'Forêt de Niederbronn':          ['hêtre', 'chêne', 'pin sylvestre'],
  'Forêt de Saverne':              ['hêtre', 'chêne', 'pin sylvestre', 'sapin'],
  'Forêt de Ribeauvillé':          ['sapin', 'hêtre', 'épicéa', 'chêne'],
  'Forêt du Sundgau':              ['chêne', 'hêtre', 'charme', 'frêne'],
  'Forêt de Verdun Est':           ['hêtre', 'chêne', 'frêne'],                   // ONF: hêtre dominant, frêne présent
  'Forêt de Commercy':             ['hêtre', 'chêne', 'charme'],
  'Forêt de Langres':              ['chêne', 'hêtre', 'charme', 'frêne'],         // plateau calcaire Haute-Marne

  // ── Compléments Bourgogne-Franche-Comté ──
  'Forêt de Saulieu':              ['chêne', 'hêtre', 'châtaignier', 'bouleau'],
  'Forêt de Cluny':                ['chêne', 'charme', 'hêtre', 'châtaignier'],

  // ── Compléments Auvergne / Auvergne-Rhône-Alpes ──
  'Forêt du Mont Mézenc':          ['épicéa', 'sapin', 'hêtre', 'pin sylvestre'],
  'Forêt de Haute Maurienne':      ['mélèze', 'épicéa', 'pin sylvestre'],
  'Forêt du Chablais':             ['épicéa', 'sapin', 'hêtre'],
  'Forêt de la Comté':             ['chêne', 'charme', 'frêne'],                  // forêt de plaine près Besançon
  'Forêt du Cézallier':            ['hêtre', 'sapin', 'épicéa'],
  'Monts de la Madeleine':         ['hêtre', 'sapin', 'chêne'],
  'Forêt de Montagne Bourbonnaise': ['hêtre', 'sapin', 'épicéa', 'chêne'],
  'Forêt du Tanargue':             ['châtaignier', 'hêtre', 'pin sylvestre'],
  'Forêt de la Bourboule':         ['hêtre', 'sapin', 'épicéa'],
  'Forêt du Mézenc':               ['pin sylvestre', 'épicéa', 'hêtre'],          // ONF: reboisement pin sylvestre + épicéa

  // ── Compléments Nouvelle-Aquitaine ──
  'Forêt de Rochechouart':         ['chêne', 'châtaignier', 'charme', 'pin sylvestre'],

  // ── Compléments Occitanie ──
  'Forêt de Mende':                ['pin sylvestre', 'hêtre', 'sapin'],
  'Forêt de Lozère':               ['pin sylvestre', 'hêtre', 'sapin', 'épicéa', 'chêne'], // IGN: chêne décidu confirmé
  'Forêt de Marvejols':            ['pin sylvestre', 'hêtre', 'sapin'],
  'Forêt du Gévaudan':             ['pin sylvestre', 'hêtre', 'sapin', 'épicéa'],

  // ── Compléments PACA ──
  'Forêt du Dévoluy':              ['mélèze', 'pin sylvestre', 'sapin', 'hêtre'],

  // ── Compléments Bretagne ──
  'Forêt de Coat-an-Noz':          ['hêtre', 'chêne', 'châtaignier'],
  'Forêt de Liffré':               ['chêne', 'hêtre', 'châtaignier', 'pin sylvestre', 'pin maritime'], // IGN: pin maritime confirmé
  'Forêt de Loudéac':              ['chêne', 'hêtre', 'pin sylvestre', 'châtaignier'],
  'Forêt de Villecartier':         ['hêtre', 'chêne', 'châtaignier'],
  'Forêt de Lorge':                ['chêne', 'hêtre', 'pin sylvestre', 'châtaignier'],
  'Forêt de Carnoët':              ['hêtre', 'chêne', 'châtaignier'],

  // ── Compléments Normandie ──
  'Forêt de Bord-Louviers':        ['chêne', 'hêtre', 'charme', 'pin sylvestre'],

  // ── Compléments Pays de la Loire ──
  'Forêt de Sillé-le-Guillaume':   ['chêne', 'hêtre', 'pin sylvestre', 'épicéa'],
  'Forêt de Chandelais':           ['chêne', 'charme', 'hêtre', 'pin maritime'],
  'Forêt de Brissac':              ['chêne', 'charme', 'frêne', 'pin maritime'],
  'Forêt de Vouvant':              ['chêne', 'hêtre', 'charme', 'pin sylvestre', 'pin maritime'],
  'Forêt de Gâvre':                ['chêne', 'hêtre', 'pin sylvestre', 'châtaignier', 'pin maritime'],
  'Forêt du Mans':                 ['pin maritime', 'chêne', 'châtaignier'],     // pin maritime dominant
  'Forêt de Perseigne':            ['chêne', 'hêtre', 'pin sylvestre'],

  // ── Compléments Centre-Val de Loire ──
  'Forêt de Vibraye':              ['chêne', 'pin sylvestre', 'châtaignier'],
  'Forêt de la Ferté-Vidame':      ['chêne', 'hêtre', 'charme'],
  'Forêt de Châteauroux':          ['chêne', 'hêtre', 'charme', 'pin sylvestre'],  // ONF: chênes + hêtre + charme
  'Forêt du Berry':                ['chêne', 'hêtre', 'charme', 'pin sylvestre'], // chênaie + plantations pin

  // ── Forêts avec apostrophes (noms échappés) ──
  "Forêt d'Hesdin":                ['chêne', 'hêtre', 'charme', 'frêne'],
  "Forêt d'Argonne":               ['hêtre', 'chêne', 'charme'],
  "Forêt d'Orient":                ['chêne', 'charme', 'frêne', 'hêtre'],
  "Forêt de Signy-l'Abbaye":       ['hêtre', 'chêne', 'charme', 'frêne'],
  "Forêt d'Épinal":                ['sapin', 'épicéa', 'hêtre', 'chêne'],
  "Forêt d'Othe":                  ['chêne', 'hêtre', 'charme'],
  "Forêt d'Auxois":                ['chêne', 'hêtre', 'charme'],
  "Forêt d'Arly":                  ['épicéa', 'sapin', 'hêtre'],
  "Forêt d'Issoire":               ['chêne', 'hêtre', 'pin sylvestre'],
  "Forêt d'Oléron":                ['pin maritime', 'chêne vert'],
  "Forêt d'Aulnay":                ['chêne', 'charme', 'frêne'],
  "Forêt d'Airvault":              ['chêne', 'charme', 'frêne'],
  "Forêt d'Aubrac":                ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'],
  "Forêt d'Eawy":                  ['hêtre', 'chêne', 'charme'],
  "Forêt d'Écouves":               ['hêtre', 'chêne', 'pin sylvestre', 'sapin'],
  "Forêt d'Andaine":               ['chêne', 'hêtre', 'pin sylvestre'],
  "Forêt d'Eu":                    ['hêtre', 'chêne', 'charme'],
  "Forêt d'Orléans":               ['chêne', 'pin sylvestre', 'hêtre', 'charme'],
  "Forêt d'Amboise":               ['chêne', 'charme', 'pin sylvestre'],
  "Forêt d'Aïtone":                ['pin sylvestre', 'hêtre', 'sapin', 'châtaignier', 'chêne vert', 'pin maritime'], // IGN: diversité corse confirmée
  "Forêt de l'Aigoual":            ['hêtre', 'sapin', 'épicéa'],
  "Forêt de l'Espinouse":          ['hêtre', 'sapin', 'châtaignier', 'chêne', 'chêne vert'], // IGN: chêne vert confirmé
  "Forêt de l'Ospédale":           ['pin sylvestre', 'chêne vert', 'pin maritime'], // IGN: pin maritime confirmé
  "Forêt de l'Aubrac":             ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'],
  "Massif de l'Estérel":           ['pin maritime', 'chêne vert'],
};

/**
 * TIER 2 — Profils régionaux par défaut (fallback)
 */
const REGIONAL_ESSENCES: Record<string, string[]> = {
  'Île-de-France':               ['chêne', 'hêtre', 'charme', 'châtaignier', 'frêne'],
  'Hauts-de-France':             ['chêne', 'hêtre', 'charme', 'frêne'],
  'Grand Est':                   ['hêtre', 'chêne', 'épicéa', 'sapin', 'pin sylvestre'],
  'Bourgogne-Franche-Comté':     ['chêne', 'hêtre', 'épicéa', 'sapin'],
  'Auvergne-Rhône-Alpes':        ['hêtre', 'épicéa', 'sapin', 'chêne', 'pin sylvestre'],
  'Auvergne':                    ['hêtre', 'chêne', 'sapin', 'épicéa'],
  'Nouvelle-Aquitaine':          ['chêne', 'pin maritime', 'châtaignier', 'hêtre'],
  'Occitanie':                   ['chêne', 'hêtre', 'pin sylvestre', 'châtaignier', 'chêne vert'],
  'PACA':                        ['chêne vert', 'pin sylvestre', 'hêtre', 'sapin', 'chêne'],
  'Bretagne':                    ['chêne', 'hêtre', 'châtaignier', 'pin sylvestre'],
  'Normandie':                   ['hêtre', 'chêne', 'charme', 'frêne'],
  'Centre-Val de Loire':         ['chêne', 'pin sylvestre', 'hêtre', 'charme', 'châtaignier'],
  'Pays de la Loire':            ['chêne', 'hêtre', 'châtaignier', 'pin sylvestre'],
  'Corse':                       ['pin sylvestre', 'hêtre', 'sapin', 'chêne vert'],
};

/**
 * TIER 3 — Heuristiques par mots-clés dans le nom
 * Appliquées en OVERRIDE sur le profil régional
 */
const NAME_PATTERNS: { test: (name: string) => boolean; essences: string[] }[] = [
  { test: n => /Vosges|Ballon|Hohwald|Donon/i.test(n),           essences: ['épicéa', 'sapin', 'hêtre', 'pin sylvestre'] },
  { test: n => /Jura|Rousses|Morez|Levier|Mignovillard/i.test(n), essences: ['épicéa', 'sapin', 'hêtre'] },
  { test: n => /Pyrénées|Iraty|Luchon|Cauterets|Ossau/i.test(n), essences: ['hêtre', 'sapin', 'épicéa', 'pin sylvestre'] },
  { test: n => /Landes|Arcachon|Mimizan|Labouheyre/i.test(n),    essences: ['pin maritime'] },
  { test: n => /Alpes|Briançonnais|Mercantour|Queyras/i.test(n), essences: ['mélèze', 'épicéa', 'sapin', 'pin sylvestre'] },
  { test: n => /Maures|Esterel/i.test(n),                        essences: ['chêne vert', 'châtaignier', 'pin maritime'] },
  { test: n => /Périgord Noir/i.test(n),                         essences: ['chêne truffier', 'chêne vert', 'noisetier', 'charme'] },
  { test: n => /Châtaigneraie/i.test(n),                         essences: ['châtaignier', 'chêne', 'hêtre'] },
  { test: n => /Cévennes/i.test(n),                              essences: ['châtaignier', 'chêne', 'hêtre', 'pin sylvestre'] },
  { test: n => /Volcans|Puy-de-Dôme|Sancy/i.test(n),            essences: ['hêtre', 'sapin', 'épicéa'] },
  { test: n => /Ventoux|Luberon|Sainte-Victoire/i.test(n),       essences: ['chêne vert', 'pin sylvestre', 'hêtre'] },
  { test: n => /Ardennes|Sedan/i.test(n),                        essences: ['chêne', 'hêtre', 'charme', 'épicéa'] },
  { test: n => /Morvan/i.test(n),                                essences: ['hêtre', 'chêne', 'épicéa', 'pin sylvestre'] },
  { test: n => /Corbières/i.test(n),                             essences: ['chêne vert', 'pin sylvestre', 'chêne'] },
  { test: n => /Millevaches/i.test(n),                           essences: ['hêtre', 'épicéa', 'pin sylvestre'] },
];

/**
 * Résout les essences dominantes d'une forêt.
 * Tier 1 (nom exact) → Tier 3 (heuristique nom) → Tier 2 (région)
 */
export function getEssencesForForest(name: string, region: string): string[] {
  // Tier 1 : correspondance exacte
  const named = NAMED_FORESTS[name];
  if (named) return named;

  // Tier 3 : heuristique par mot-clé dans le nom
  for (const pattern of NAME_PATTERNS) {
    if (pattern.test(name)) return pattern.essences;
  }

  // Tier 2 : profil régional par défaut
  return REGIONAL_ESSENCES[region] || ['chêne', 'hêtre'];
}
