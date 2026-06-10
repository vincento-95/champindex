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

// ── Conseils photo ──

const PHOTO_TIPS: { icon: string; text: string }[] = [
  { icon: 'center_focus_strong', text: 'Photographiez de près, bien centré' },
  { icon: 'light_mode', text: 'Bonne luminosité, pas de flash' },
  { icon: 'swap_vert', text: 'Champignons : dessus ET dessous du chapeau' },
  { icon: 'eco', text: 'Plantes : feuilles ou fleurs bien visibles' },
  { icon: 'filter_1', text: 'Une seule espèce par photo' },
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
      isDeadly ? 'border-2 border-red-500/60' : isToxic ? 'border border-amber-500/40' : 'border border-[#3d4d35]'
    } bg-[#232e1c] shadow-lg`}>
      {isDeadly && (
        <div className="bg-red-700/90 px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-lg">☠️</span>
          <div>
            <p className="text-xs font-bold text-white">ESPÈCE POTENTIELLEMENT MORTELLE</p>
            <p className="text-[10px] text-red-200">Ne JAMAIS consommer. Consultez un expert.</p>
          </div>
        </div>
      )}

      {isToxic && !isDeadly && (
        <div className="bg-amber-800/70 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-[11px] font-bold text-amber-200">Espèce possiblement toxique</p>
        </div>
      )}

      <button onClick={() => setShowDetails(!showDetails)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 relative">
            {result.images?.[0]?.url?.m ? (
              <img src={result.images[0].url.m} alt={commonName}
                className="w-14 h-14 rounded-xl object-cover border border-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#2a3523] border border-[#3d4d35] flex items-center justify-center text-2xl">
                {localMatch?.emoji || '🌱'}
              </div>
            )}
            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-[#1a2215] flex items-center justify-center shadow">
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
                <span className="text-[11px] text-[#4ade80]/90 font-medium">
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
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-white/10" />
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
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Confusions possibles</p>
                    {localMatch.confusions.map((c, i) => (
                      <div key={i} className={`rounded-lg p-2 text-[11px] ${
                        c.danger === 'mortel' ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : c.danger === 'toxique' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                        : 'bg-white/5 text-white/50'
                      }`}>
                        {c.danger === 'mortel' ? '☠️' : c.danger === 'toxique' ? '⚠️' : 'ℹ️'} {c.espece}
                        {c.description && <span className="text-white/40"> — {c.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {localMatch.avertissement && (
                  <div className="rounded-lg bg-red-900/30 border border-red-500/30 p-2">
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
          className="w-full min-h-[44px] py-3 border-t border-white/10 text-xs font-semibold text-[#4ade80]
            hover:bg-emerald-700/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">description</span>
          Voir la fiche complète de {localMatch.nom}
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
      {/* Header (Stitch style) */}
      <header className="sticky top-0 z-10 bg-[#1a2215]/95 backdrop-blur-md border-b border-white/10 px-4 pt-6 pb-4 flex items-center justify-between">
        <button onClick={onBack} aria-label="Retour"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold tracking-tight">Identifier</h2>
        {remaining !== null ? (
          <span className="bg-[#2a3523] px-3 py-1 rounded-full text-xs font-medium text-white/80 border border-[#3d4d35]">
            {remaining} scans restants
          </span>
        ) : (
          <div className="w-11" />
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {/* Disclaimer sécurité */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-400 text-xl flex-shrink-0" aria-hidden="true">warning</span>
          <div>
            <p className="text-xs text-red-200 leading-relaxed">
              L'identification par IA est <span className="font-bold">INDICATIVE</span> uniquement.
              Ne consommez <span className="font-bold">JAMAIS</span> sans l'avis d'un expert.
            </p>
            <p className="text-[11px] text-red-200/80 leading-relaxed mt-1">
              Faites <span className="font-bold">TOUJOURS</span> vérifier par un pharmacien ou un mycologue.
              Une erreur d'identification peut être <span className="font-bold">MORTELLE</span>.
            </p>
          </div>
        </div>

        {!imagePreview ? (
          <div className="flex flex-col">
            {/* Grande zone de capture (bordure pointillée émeraude) */}
            <button onClick={() => cameraInputRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-[3px] border-dashed border-[#4ade80]/80
                bg-[#2a3523]/30 hover:bg-[#2a3523]/50 active:scale-95 transition-all duration-200
                flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-outlined text-emerald-300 text-[56px]" aria-hidden="true">photo_camera</span>
              <span className="text-[#4ade80] font-bold text-lg">Prendre une photo</span>
            </button>

            {/* Accès galerie discret */}
            <button onClick={() => fileInputRef.current?.click()}
              className="mx-auto mt-4 flex items-center justify-center gap-2 min-h-[44px] px-5
                text-gray-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">image</span>
              <span className="text-sm font-medium">Galerie</span>
            </button>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {/* Conseils photo */}
            <div className="bg-[#2a3523] rounded-2xl p-5 border border-[#3d4d35] shadow-lg mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Conseils photo</h3>
              <ul className="space-y-4">
                {PHOTO_TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-lg leading-none text-emerald-400 flex-shrink-0" aria-hidden="true">
                      {tip.icon}
                    </span>
                    <p className="text-sm text-gray-200">{tip.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-[#3d4d35] shadow-lg">
              <img src={imagePreview} alt="Photo à identifier" className="w-full max-h-64 object-cover" />
              <button onClick={handleReset} aria-label="Supprimer la photo"
                className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm text-white/90
                  flex items-center justify-center hover:bg-black/80 transition-colors">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
              </button>
            </div>

            {/* Sélecteur organe */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">Que montre la photo ?</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {ORGANS.map(o => (
                  <button key={o.id} onClick={() => setOrgan(o.id)}
                    className={`flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-sm font-medium
                      whitespace-nowrap transition-all active:scale-95 ${
                      organ === o.id
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-[#3d4d35]'
                    }`}>
                    <span aria-hidden="true">{o.emoji}</span> {o.label}
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
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">search</span>
                  Identifier cette espèce
                </span>
              )}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-3">
                <p className="text-xs text-red-300 text-center">{error}</p>
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/90">
                    {results.length > 0 ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Aucun résultat'}
                  </p>
                  <button onClick={handleReset}
                    className="flex items-center gap-1 min-h-[44px] px-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
                    <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
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

                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mt-2 flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">☠️</span>
                  <p className="text-[11px] text-red-200 leading-relaxed">
                    <span className="font-bold">RAPPEL :</span> ces résultats sont des SUGGESTIONS algorithmiques.
                    Ne consommez <span className="font-bold">RIEN</span> sans vérification par un expert.
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
