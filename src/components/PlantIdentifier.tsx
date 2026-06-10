// ============================================================
// ChampIndex — Identification par photo (PlantNet)
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { identifySpecies, matchToLocalSpecies, type PlantNetResult, type PlantOrgan } from '../lib/plantnet-api';
import type { ForagingSpecies } from '../types';

interface PlantIdentifierProps {
  onBack: () => void;
  onViewSpecies?: (species: ForagingSpecies) => void;
}

// ── Confiance ──

function getConfidenceColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.7) return 'Confiance élevée';
  if (score >= 0.4) return 'Confiance moyenne';
  return 'Confiance faible';
}

// ── Organes ──

const ORGANS: { id: PlantOrgan; emoji: string; label: string }[] = [
  { id: 'leaf', emoji: '🍃', label: 'Feuille' },
  { id: 'flower', emoji: '🌸', label: 'Fleur' },
  { id: 'fruit', emoji: '🫐', label: 'Fruit' },
  { id: 'bark', emoji: '🪵', label: 'Écorce' },
  { id: 'habit', emoji: '🌳', label: 'Plante entière' },
];

// ── Carte résultat ──

function ResultCard({
  result,
  rank,
  onViewSpecies,
}: {
  result: PlantNetResult;
  rank: number;
  onViewSpecies?: (species: ForagingSpecies) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const confidence = Math.round(result.score * 100);
  const localMatch = matchToLocalSpecies(result.species.scientificNameWithoutAuthor);
  const commonName = result.species.commonNames?.[0] || result.species.scientificNameWithoutAuthor;
  const isDeadly = localMatch?.comestibilite === 'mortel' || localMatch?.dangerConfusion === 'mortel';
  const isToxic = localMatch?.comestibilite === 'toxique';

  return (
    <div className={`rounded-2xl overflow-hidden ${
      isDeadly ? 'border-2 border-red-500/50' : isToxic ? 'border border-amber-500/30' : 'border border-white/10'
    } bg-white/5`}>
      {isDeadly && (
        <div className="bg-red-700/80 px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">☠️</span>
          <div>
            <p className="text-xs font-bold text-white">ESPÈCE POTENTIELLEMENT MORTELLE</p>
            <p className="text-[10px] text-red-200">Ne JAMAIS consommer. Consultez un expert.</p>
          </div>
        </div>
      )}

      {isToxic && !isDeadly && (
        <div className="bg-amber-800/60 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-[11px] font-medium text-amber-200">Espèce possiblement toxique</p>
        </div>
      )}

      <button onClick={() => setShowDetails(!showDetails)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 relative">
            {result.images?.[0]?.url?.m ? (
              <img src={result.images[0].url.m} alt={commonName}
                className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                {localMatch?.emoji || '🌱'}
              </div>
            )}
            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white/20 text-[10px] font-bold text-white flex items-center justify-center">
              {rank}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/90">{commonName}</p>
            <p className="text-xs text-white/40 italic">{result.species.scientificNameWithoutAuthor}</p>
            <p className="text-[11px] text-white/30 mt-0.5">
              {result.species.family.scientificName}
            </p>
            {localMatch && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-sm">{localMatch.emoji}</span>
                <span className="text-[11px] text-emerald-400/80 font-medium">
                  Dans notre base : {localMatch.nom}
                </span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-right">
            <p className={`text-lg font-bold ${getConfidenceColor(result.score)}`}>{confidence}%</p>
            <p className={`text-[10px] ${getConfidenceColor(result.score)}`}>{getConfidenceLabel(result.score)}</p>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            {result.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {result.images.slice(0, 5).map((img, i) => (
                  <img key={i} src={img.url.m} alt={`${commonName} ${i + 1}`}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                ))}
              </div>
            )}

            {localMatch && (
              <div className="space-y-1.5">
                {localMatch.description && (
                  <p className="text-xs text-white/60">{localMatch.description}</p>
                )}
                {localMatch.partiesComestibles && (
                  <p className="text-[11px] text-emerald-400/70">🍽️ {localMatch.partiesComestibles}</p>
                )}
                {localMatch.confusions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Confusions possibles</p>
                    {localMatch.confusions.map((c, i) => (
                      <div key={i} className={`rounded-lg p-2 text-[11px] ${
                        c.danger === 'mortel' ? 'bg-red-500/10 text-red-300'
                        : c.danger === 'toxique' ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-white/5 text-white/50'
                      }`}>
                        {c.danger === 'mortel' ? '☠️' : c.danger === 'toxique' ? '⚠️' : 'ℹ️'} {c.espece}
                        {c.description && <span className="text-white/40"> — {c.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {localMatch.avertissement && (
                  <div className="rounded-lg bg-red-900/30 border border-red-500/20 p-2">
                    <p className="text-xs text-red-300">⚠️ {localMatch.avertissement}</p>
                  </div>
                )}
              </div>
            )}

            {!localMatch && (
              <p className="text-xs text-white/40 italic">
                Espèce non référencée dans notre base. Consultez un expert pour l'identification.
              </p>
            )}
          </div>
        )}
      </button>

      {/* Bouton voir la fiche — uniquement si match local */}
      {localMatch && onViewSpecies && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewSpecies(localMatch); }}
          className="w-full py-2.5 border-t border-white/5 text-xs font-medium text-emerald-400
            hover:bg-emerald-700/20 transition-colors"
        >
          📋 Voir la fiche complète de {localMatch.nom}
        </button>
      )}
    </div>
  );
}

// ── Composant principal ──

export default function PlantIdentifier({ onBack, onViewSpecies }: PlantIdentifierProps) {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [organ, setOrgan] = useState<PlantOrgan>('leaf');
  const [results, setResults] = useState<PlantNetResult[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResults(null);
    setError(null);
  }, []);

  const handleIdentify = useCallback(async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    try {
      const response = await identifySpecies(image, organ);
      setResults(response.results);
      setRemaining(response.remainingIdentificationRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [image, organ]);

  const handleReset = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
  }, [imagePreview]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button onClick={onBack}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-colors">
          ← Retour
        </button>
        <h2 className="text-lg font-bold text-white/90" style={{ fontFamily: 'Playfair Display, serif' }}>
          Identifier
        </h2>
        {remaining !== null ? (
          <span className="text-[10px] text-white/30">{remaining} id. restantes</span>
        ) : (
          <span className="w-16" />
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {/* Disclaimer */}
        <div className="bg-red-900/30 border border-red-500/20 rounded-xl p-3 mb-4">
          <p className="text-xs text-red-300 leading-relaxed text-center font-medium">
            ⚠️ L'identification par IA est INDICATIVE uniquement.
          </p>
          <p className="text-[10px] text-red-200/70 leading-relaxed text-center mt-1">
            Ne consommez JAMAIS une espèce identifiée uniquement par cette app.
            Faites TOUJOURS vérifier par un pharmacien ou un mycologue.
            Une erreur d'identification peut être MORTELLE.
          </p>
        </div>

        {!imagePreview ? (
          <div className="space-y-3">
            <button onClick={() => cameraInputRef.current?.click()}
              className="w-full py-8 rounded-2xl bg-emerald-700/20 border-2 border-dashed border-emerald-500/30
                hover:bg-emerald-700/30 transition-colors flex flex-col items-center gap-2">
              <span className="text-4xl">📸</span>
              <p className="text-sm font-medium text-emerald-300">Prendre une photo</p>
              <p className="text-[11px] text-white/40">Caméra arrière recommandée</p>
            </button>

            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10
                hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">🖼️</span>
              <p className="text-sm text-white/70">Choisir depuis la galerie</p>
            </button>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <div className="bg-white/5 rounded-xl p-3 mt-4">
              <p className="text-[11px] text-white/50 font-medium mb-2">Conseils pour une bonne identification :</p>
              <ul className="text-[11px] text-white/40 space-y-1">
                <li>📐 Photographiez de près, bien centré</li>
                <li>💡 Bonne luminosité, pas de flash</li>
                <li>🍄 Champignons : dessus ET dessous du chapeau</li>
                <li>🌿 Plantes : feuilles ou fleurs bien visibles</li>
                <li>📏 Une seule espèce par photo</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imagePreview} alt="Photo à identifier" className="w-full max-h-64 object-cover" />
              <button onClick={handleReset}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white/80 flex items-center justify-center hover:bg-black/80">
                &times;
              </button>
            </div>

            {/* Sélecteur organe */}
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Que montre la photo ?</p>
              <div className="flex gap-1.5">
                {ORGANS.map(o => (
                  <button key={o.id} onClick={() => setOrgan(o.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      organ === o.id ? 'bg-emerald-700 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}>
                    {o.emoji} {o.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleIdentify} disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-white
                bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500
                active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/40
                disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Identification en cours...
                </span>
              ) : (
                '🔍 Identifier cette espèce'
              )}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-300 text-center">{error}</p>
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/90">
                    {results.length > 0 ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Aucun résultat'}
                  </p>
                  <button onClick={handleReset} className="text-xs text-amber-400 hover:text-amber-300">
                    Nouvelle photo
                  </button>
                </div>

                {results.length === 0 && (
                  <div className="text-center py-6 text-white/40">
                    <p className="text-3xl mb-2">🤔</p>
                    <p className="text-sm">Espèce non reconnue.</p>
                    <p className="text-xs text-white/30 mt-1">Essayez une photo plus nette ou un angle différent.</p>
                  </div>
                )}

                {results.slice(0, 5).map((r, i) => (
                  <ResultCard key={i} result={r} rank={i + 1} onViewSpecies={onViewSpecies} />
                ))}

                <div className="bg-red-900/30 border border-red-500/20 rounded-xl p-3 mt-2">
                  <p className="text-[11px] text-red-300 text-center leading-relaxed">
                    ☠️ RAPPEL : ces résultats sont des SUGGESTIONS algorithmiques.
                    Ne consommez RIEN sans vérification par un expert.
                    Centres antipoison : Paris 01 40 05 48 48 · Lyon 04 72 11 69 11
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
