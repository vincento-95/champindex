// ============================================================
// ChampIndex — Fiche espèce foraging (champignon, plante, baie)
// ============================================================

import { useState, memo } from 'react';
import type { ForagingSpecies, ForagingEdibility, SeasonDetail, ConfusionDangerLevel } from '../types';
import SpeciesPhoto from './SpeciesPhoto';

interface SpeciesCardProps {
  species: ForagingSpecies;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  note?: string;
  onSaveNote?: (speciesId: string, speciesName: string, content: string) => void;
}

// ── Style commun des pills d'en-tête (maquette Stitch) ──

const pillBase = 'px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap';

// ── Couleurs pluie ──

const rainColors: Record<string, string> = {
  'faible': 'bg-sky-900/40 border-sky-500 text-sky-400',
  'modéré': 'bg-cyan-900/40 border-cyan-500 text-cyan-400',
  'élevé': 'bg-blue-900/40 border-blue-500 text-blue-400',
  'très élevé': 'bg-indigo-900/40 border-indigo-500 text-indigo-400',
};

// ── Badge danger confusion ──

const dangerBadge: Record<ConfusionDangerLevel, { label: string; className: string }> = {
  tres_faible: { label: 'Confusion faible', className: 'bg-emerald-900/40 border-emerald-500 text-emerald-400' },
  faible: { label: 'Confusion faible', className: 'bg-emerald-900/40 border-emerald-500 text-emerald-400' },
  moyen: { label: 'Confusion possible', className: 'bg-amber-900/40 border-amber-500 text-amber-400' },
  eleve: { label: 'Confusion dangereuse ⚠️', className: 'bg-red-900/40 border-red-500 text-red-400' },
  tres_eleve: { label: 'Confusion dangereuse ⚠️', className: 'bg-red-900/40 border-red-500 text-red-400' },
  mortel: { label: 'MORTEL ☠️', className: 'bg-red-600/30 border-red-500 text-red-300 animate-pulse' },
};

// ── Badge comestibilité ──

const edibilityBadge: Record<ForagingEdibility, { label: string; className: string }> = {
  exceptionnel: { label: 'Exceptionnel', className: 'bg-emerald-900/40 border-emerald-500 text-emerald-400' },
  excellent: { label: 'Excellent', className: 'bg-emerald-900/40 border-emerald-500 text-emerald-400' },
  tres_bon: { label: 'Très bon', className: 'bg-emerald-900/40 border-emerald-500 text-emerald-400' },
  bon: { label: 'Bon', className: 'bg-lime-900/40 border-lime-500 text-lime-400' },
  moyen: { label: 'Moyen', className: 'bg-yellow-900/40 border-yellow-500 text-yellow-400' },
  mediocre: { label: 'Médiocre', className: 'bg-stone-800/60 border-stone-500 text-stone-400' },
  medicinal: { label: 'Médicinal', className: 'bg-violet-900/40 border-violet-500 text-violet-400' },
  non_comestible: { label: 'Non comestible', className: 'bg-slate-800/60 border-slate-500 text-slate-400' },
  toxique: { label: 'Toxique ⚠️', className: 'bg-orange-900/40 border-orange-500 text-orange-400' },
  mortel: { label: 'Mortel ☠️', className: 'bg-red-900/40 border-red-500 text-red-400' },
};

// ── Icône essence d'arbre (sapin vs feuillu) ──

function essenceIcon(name: string): string {
  return /sapin|épicéa|epicea|pin|mélèze|meleze|conifère|conifere|cèdre|cedre/i.test(name) ? 'forest' : 'park';
}

// ── Calendrier saisonnalité (rangée des 12 mois, style maquette) ──

const MONTH_KEYS: (keyof SeasonDetail)[] = [
  'jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec',
];
const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

function MiniCalendar({ saisonDetail }: { saisonDetail: SeasonDetail }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#131910]/50 border border-white/5 px-1.5 py-1.5">
      {MONTH_KEYS.map((key, i) => {
        const intensity = saisonDetail[key];
        const cls =
          intensity === 'peak'
            ? 'bg-amber-500 text-white font-bold rounded-full ring-2 ring-amber-500/50'
            : intensity === 'season'
              ? 'bg-emerald-500 text-white font-bold rounded-full'
              : 'text-slate-500 font-medium';
        return (
          <span
            key={key}
            className={`w-6 h-6 flex items-center justify-center text-xs leading-none ${cls}`}
          >
            {MONTH_LABELS[i]}
          </span>
        );
      })}
    </div>
  );
}

// ── Composant principal ──

export default memo(function SpeciesCard({ species, isFavorite, onToggleFavorite, note, onSaveNote }: SpeciesCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const badge = dangerBadge[species.dangerConfusion];
  const edible = edibilityBadge[species.comestibilite];

  const isDeadly = species.dangerConfusion === 'mortel' || species.comestibilite === 'mortel';
  const isToxic = species.comestibilite === 'toxique' || species.dangerConfusion === 'tres_eleve';

  return (
    <div className={`rounded-3xl bg-[#263121]/80 backdrop-blur-md overflow-hidden shadow-lg shadow-black/20 transition-all ${
      isDeadly ? 'border-2 border-red-500/60' : isToxic ? 'border border-amber-500/40' : 'border border-white/10'
    }`}>
      {/* Bandeau mortel — impossible à rater */}
      {isDeadly && (
        <div className="bg-red-700 px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-xl">☠️</span>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wide">Espèce mortelle</p>
            <p className="text-[11px] text-red-100 font-medium">Ne JAMAIS consommer. Confusion potentiellement fatale.</p>
          </div>
        </div>
      )}

      {/* Bandeau toxique */}
      {isToxic && !isDeadly && (
        <div className="bg-amber-700/80 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-[11px] font-bold text-amber-100">Espèce toxique ou à confusion très dangereuse</p>
        </div>
      )}

      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${species.nom} — ${expanded ? 'replier' : 'déplier'} la fiche`}
        className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Favori */}
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(species.id); }}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="w-11 h-11 -ml-2 -my-1 flex items-center justify-center flex-shrink-0 transition-transform active:scale-125"
            >
              <span
                className={`material-symbols-outlined text-[22px] ${isFavorite ? 'text-red-500' : 'text-white/40'}`}
                style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
            </button>
          )}

          {/* Photo ou emoji — zone agrandie (Stitch) */}
          <div className="w-16 h-16 rounded-xl bg-[#131910]/60 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <SpeciesPhoto speciesId={species.id} emoji={species.emoji} nom={species.nom} size="md" />
          </div>

          {/* Nom + latin */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white truncate">{species.nom}</p>
            <p className="text-xs text-gray-400 italic truncate">{species.latin}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <span className={`${pillBase} ${badge.className}`}>
              {badge.label}
            </span>
            <span className={`${pillBase} ${edible.className}`}>
              {edible.label}
            </span>
            <span className={`${pillBase} ${rainColors[species.besoinPluie] || 'bg-blue-900/40 border-blue-500 text-blue-400'}`}>
              Pluie: {species.besoinPluie}
            </span>
          </div>
        </div>

        {/* Parties comestibles (plantes & baies) */}
        {species.partiesComestibles && (
          <p className="text-[11px] text-emerald-400/80 mt-2.5">
            🍽️ {species.partiesComestibles}
          </p>
        )}

        {/* Saisonnalité */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Saisonnalité</p>
            <span className={`material-symbols-outlined text-base text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>
          <MiniCalendar saisonDetail={species.saisonDetail} />
        </div>
      </button>

      {/* Section dépliable */}
      {expanded && (
        <div className="px-4 pb-5 pt-4 space-y-5 border-t border-white/5">
          {/* Description */}
          {species.description && (
            <div>
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{species.description}</p>
            </div>
          )}

          {/* Habitats */}
          {species.habitats.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Habitat &amp; Sol</h4>
              <div className="flex flex-wrap gap-2">
                {species.habitats.map(h => (
                  <span key={h} className="px-3 py-1 rounded-full bg-[#34432d]/70 border border-white/10 text-xs text-gray-300 capitalize">
                    {h.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Essences */}
          {species.essences.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Essences d'arbres</h4>
              <div className="flex flex-wrap gap-2">
                {species.essences.map(e => (
                  <span key={e} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34432d]/70 border border-white/10 text-xs text-gray-300">
                    <span className="material-symbols-outlined text-[14px] text-emerald-400">{essenceIcon(e)}</span>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conseils cueillette */}
          {species.conseilsCueillette && (
            <div className="rounded-2xl bg-[#131910]/40 border-l-4 border-emerald-500 p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                <span className="material-symbols-outlined text-base text-emerald-400">lightbulb</span>
                Conseil de cueillette
              </h4>
              <p className="text-xs text-gray-400 italic leading-relaxed">{species.conseilsCueillette}</p>
            </div>
          )}

          {/* Usages culinaires — Astuce cuisine */}
          {species.usagesCulinaires && (
            <div className="rounded-2xl bg-[#131910]/40 border-l-4 border-[#d4af37] p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                <span className="material-symbols-outlined text-base text-[#d4af37]">restaurant</span>
                Astuce cuisine
              </h4>
              <p className="text-xs text-gray-400 italic leading-relaxed">{species.usagesCulinaires}</p>
            </div>
          )}

          {/* Confusions possibles — SÉCURITÉ */}
          {species.confusions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">
                Risques de confusion
              </h4>
              <div className="space-y-2.5">
                {species.confusions.map((c, i) => {
                  const rowColor =
                    c.danger === 'mortel' ? 'border-red-500/60 bg-red-950/30'
                    : c.danger === 'toxique' ? 'border-amber-500/60 bg-amber-950/30'
                    : 'border-white/15 bg-white/5';
                  const tag =
                    c.danger === 'mortel' ? { label: 'MORTEL ☠️', cls: 'text-red-400 bg-red-500/15 border-red-500/40' }
                    : c.danger === 'toxique' ? { label: 'TOXIQUE ⚠️', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/40' }
                    : { label: 'INOFFENSIF', cls: 'text-gray-400 bg-white/10 border-white/15' };
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${rowColor}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{c.espece}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${tag.cls}`}>
                          {tag.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Avertissement spécifique — SÉCURITÉ */}
          {species.avertissement && (
            <div className="rounded-xl bg-red-950/50 border-2 border-red-500/60 p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-lg text-red-400 flex-shrink-0">warning</span>
              <p className="text-xs font-medium text-red-200 leading-relaxed">{species.avertissement}</p>
            </div>
          )}

          {/* Notes personnelles */}
          {onSaveNote && (
            <div className="rounded-xl bg-[#131910]/60 border border-white/5 p-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Mes notes</h4>
                {!editingNote && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
                    aria-label="Modifier mes notes"
                    className="w-11 h-11 -m-3 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                )}
              </div>
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Mes notes sur cette espèce..."
                    rows={3}
                    onClick={e => e.stopPropagation()}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
                      text-xs text-white/80 placeholder:text-white/20 focus:outline-none
                      focus:border-emerald-500/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingNote(false); setNoteText(note || ''); }}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:bg-white/10 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSaveNote(species.id, species.nom, noteText); setEditingNote(false); }}
                      className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
                  className="w-full min-h-[32px] text-left text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {note
                    ? <span>{note.length > 50 ? note.slice(0, 50) + '...' : note}</span>
                    : <span className="text-white/30">Ajouter une note...</span>}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer légal — toujours visible, renforcé pour espèces dangereuses */}
      <div className={`px-3 py-3 ${isDeadly ? 'bg-red-700' : 'bg-red-600'}`}>
        <p className={`text-center font-black text-white uppercase leading-snug ${isDeadly ? 'text-xs tracking-tight' : 'text-[11px] tracking-tighter'}`}>
          {isDeadly
            ? '☠️ DANGER MORTEL — Identification par un mycologue ou pharmacien OBLIGATOIRE avant toute consommation.'
            : '⚠️ Ne consommez JAMAIS sans l\'avis d\'un expert. En cas de doute, consultez un pharmacien.'}
        </p>
      </div>
    </div>
  );
});
