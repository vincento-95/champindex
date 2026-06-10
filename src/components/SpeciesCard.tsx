// ============================================================
// ChampIndex — Fiche espèce foraging (champignon, plante, baie)
// ============================================================

import { useState, memo } from 'react';
import type { ForagingSpecies, ForagingEdibility, SeasonDetail, ConfusionDangerLevel } from '../types';
import SpeciesPhoto from './SpeciesPhoto';
import { IconDanger } from './Icons';

interface SpeciesCardProps {
  species: ForagingSpecies;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  note?: string;
  onSaveNote?: (speciesId: string, speciesName: string, content: string) => void;
}

// ── Style commun des pills d'en-tête ──

const pillBase = 'px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap';

// ── Badge danger confusion ──

const dangerBadge: Record<ConfusionDangerLevel, { label: string; className: string }> = {
  tres_faible: { label: 'Confusion faible', className: 'bg-moss-wash text-moss' },
  faible: { label: 'Confusion faible', className: 'bg-moss-wash text-moss' },
  moyen: { label: 'Confusion possible', className: 'bg-paper-deep text-ink-soft' },
  eleve: { label: 'Confusion dangereuse', className: 'bg-terra-wash text-terra' },
  tres_eleve: { label: 'Confusion dangereuse', className: 'bg-terra-wash text-terra' },
  mortel: { label: 'MORTEL', className: 'bg-danger text-paper' },
};

// ── Badge comestibilité ──

const edibilityBadge: Record<ForagingEdibility, { label: string; className: string }> = {
  exceptionnel: { label: 'Exceptionnel', className: 'bg-terra-wash text-terra' },
  excellent: { label: 'Excellent', className: 'bg-paper-deep text-ink-soft' },
  tres_bon: { label: 'Très bon', className: 'bg-paper-deep text-ink-soft' },
  bon: { label: 'Bon', className: 'bg-paper-deep text-ink-soft' },
  moyen: { label: 'Moyen', className: 'bg-paper-deep text-ink-soft' },
  mediocre: { label: 'Médiocre', className: 'bg-paper-deep text-ink-soft' },
  medicinal: { label: 'Médicinal', className: 'bg-paper-deep text-ink-soft' },
  non_comestible: { label: 'Non comestible', className: 'bg-paper-deep text-ink-soft' },
  toxique: { label: 'Toxique', className: 'bg-danger-wash text-danger border border-danger/30' },
  mortel: { label: 'Mortel', className: 'bg-danger text-paper' },
};

// ── Icône essence d'arbre (sapin vs feuillu) ──

function essenceIcon(name: string): string {
  return /sapin|épicéa|epicea|pin|mélèze|meleze|conifère|conifere|cèdre|cedre/i.test(name) ? 'forest' : 'park';
}

// ── Calendrier saisonnalité (rangée des 12 mois) ──

const MONTH_KEYS: (keyof SeasonDetail)[] = [
  'jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec',
];
const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

function MiniCalendar({ saisonDetail }: { saisonDetail: SeasonDetail }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-paper-deep px-1.5 py-1.5">
      {MONTH_KEYS.map((key, i) => {
        const intensity = saisonDetail[key];
        const cls =
          intensity === 'peak'
            ? 'bg-terra text-paper font-bold rounded-full'
            : intensity === 'season'
              ? 'bg-moss text-paper font-bold rounded-full'
              : 'text-ink-faint font-medium';
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
    <div className={`rounded-2xl bg-paper-raised overflow-hidden transition-all ${
      isDeadly ? 'border-2 border-danger' : isToxic ? 'border border-danger/60' : 'border border-line'
    }`}>
      {/* Bandeau mortel — impossible à rater */}
      {isDeadly && (
        <div className="bg-danger px-4 py-2.5 flex items-center gap-2.5">
          <IconDanger size={22} className="text-paper flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-paper uppercase tracking-wide">Espèce mortelle</p>
            <p className="text-[11px] text-paper/85 font-medium">Ne JAMAIS consommer. Confusion potentiellement fatale.</p>
          </div>
        </div>
      )}

      {/* Bandeau toxique */}
      {isToxic && !isDeadly && (
        <div className="bg-danger-wash border-b border-danger/30 px-4 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-danger flex-shrink-0">warning</span>
          <p className="text-[11px] font-bold text-danger">Espèce toxique ou à confusion très dangereuse</p>
        </div>
      )}

      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${species.nom} — ${expanded ? 'replier' : 'déplier'} la fiche`}
        className="w-full text-left p-4 hover:bg-paper-deep/40 transition-colors"
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
                className={`material-symbols-outlined text-[22px] ${isFavorite ? 'text-terra' : 'text-ink-faint'}`}
                style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
            </button>
          )}

          {/* Photo ou emoji espèce — tuile neutre */}
          <div className="w-16 h-16 rounded-xl bg-paper-deep flex items-center justify-center flex-shrink-0 overflow-hidden">
            <SpeciesPhoto speciesId={species.id} emoji={species.emoji} nom={species.nom} size="md" />
          </div>

          {/* Nom + latin */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-display font-semibold text-ink truncate">{species.nom}</p>
            <p className="text-xs text-ink-faint italic truncate">{species.latin}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <span className={`${pillBase} ${badge.className}`}>
              {badge.label}
            </span>
            <span className={`${pillBase} ${edible.className}`}>
              {edible.label}
            </span>
            <span className={`${pillBase} bg-paper-deep text-ink-soft`}>
              Pluie: {species.besoinPluie}
            </span>
          </div>
        </div>

        {/* Parties comestibles (plantes & baies) */}
        {species.partiesComestibles && (
          <p className="text-[11px] text-ink-soft mt-2.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-moss flex-shrink-0">restaurant</span>
            <span>{species.partiesComestibles}</span>
          </p>
        )}

        {/* Saisonnalité */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint font-bold">Saisonnalité</p>
            <span className={`material-symbols-outlined text-base text-ink-faint transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>
          <MiniCalendar saisonDetail={species.saisonDetail} />
        </div>
      </button>

      {/* Section dépliable */}
      {expanded && (
        <div className="px-4 pb-5 pt-4 space-y-5 border-t border-line">
          {/* Description */}
          {species.description && (
            <div>
              <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.18em] mb-2">Description</h4>
              <p className="text-sm text-ink-soft leading-relaxed">{species.description}</p>
            </div>
          )}

          {/* Habitats */}
          {species.habitats.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.18em] mb-2">Habitat &amp; Sol</h4>
              <div className="flex flex-wrap gap-2">
                {species.habitats.map(h => (
                  <span key={h} className="px-3 py-1 rounded-full bg-paper-deep text-xs text-ink-soft capitalize">
                    {h.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Essences */}
          {species.essences.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.18em] mb-2">Essences d'arbres</h4>
              <div className="flex flex-wrap gap-2">
                {species.essences.map(e => (
                  <span key={e} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-deep text-xs text-ink-soft">
                    <span className="material-symbols-outlined text-[14px] text-moss">{essenceIcon(e)}</span>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conseils cueillette */}
          {species.conseilsCueillette && (
            <div className="rounded-2xl bg-paper-deep border-l-4 border-moss p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
                <span className="material-symbols-outlined text-base text-moss">lightbulb</span>
                Conseil de cueillette
              </h4>
              <p className="text-xs text-ink-soft italic leading-relaxed">{species.conseilsCueillette}</p>
            </div>
          )}

          {/* Usages culinaires — Astuce cuisine */}
          {species.usagesCulinaires && (
            <div className="rounded-2xl bg-paper-deep border-l-4 border-terra p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
                <span className="material-symbols-outlined text-base text-terra">restaurant</span>
                Astuce cuisine
              </h4>
              <p className="text-xs text-ink-soft italic leading-relaxed">{species.usagesCulinaires}</p>
            </div>
          )}

          {/* Confusions possibles — SÉCURITÉ */}
          {species.confusions.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-danger uppercase tracking-[0.18em] mb-3">
                Risques de confusion
              </h4>
              <div className="space-y-2.5">
                {species.confusions.map((c, i) => {
                  const rowColor =
                    c.danger === 'mortel' ? 'bg-danger-wash/60 border border-danger/40'
                    : 'bg-paper-deep';
                  const tag =
                    c.danger === 'mortel' ? { label: 'MORTEL', cls: 'bg-danger text-paper' }
                    : c.danger === 'toxique' ? { label: 'TOXIQUE', cls: 'bg-terra-wash text-terra border border-terra/40' }
                    : { label: 'INOFFENSIF', cls: 'bg-paper-deep text-ink-faint border border-line' };
                  return (
                    <div key={i} className={`rounded-xl p-3 ${rowColor}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{c.espece}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${tag.cls}`}>
                          {c.danger === 'mortel' && <IconDanger size={12} className="flex-shrink-0" />}
                          {c.danger === 'toxique' && <span className="material-symbols-outlined text-[13px] flex-shrink-0">warning</span>}
                          {tag.label}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Avertissement spécifique — SÉCURITÉ */}
          {species.avertissement && (
            <div className="rounded-xl bg-danger-wash border-2 border-danger/50 p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-lg text-danger flex-shrink-0">warning</span>
              <p className="text-xs font-medium text-danger leading-relaxed">{species.avertissement}</p>
            </div>
          )}

          {/* Notes personnelles */}
          {onSaveNote && (
            <div className="rounded-xl bg-paper-deep p-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.18em]">Mes notes</h4>
                {!editingNote && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
                    aria-label="Modifier mes notes"
                    className="w-11 h-11 -m-3 flex items-center justify-center text-moss hover:text-moss-deep transition-colors"
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
                    className="w-full px-3 py-2 rounded-lg bg-paper-raised border border-line
                      text-xs text-ink placeholder:text-ink-faint focus:outline-none
                      focus:border-moss resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingNote(false); setNoteText(note || ''); }}
                      className="flex-1 px-4 py-3 rounded-xl bg-paper-raised border border-line-strong text-xs font-medium text-ink hover:bg-paper transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSaveNote(species.id, species.nom, noteText); setEditingNote(false); }}
                      className="flex-1 px-4 py-3 rounded-xl bg-moss text-xs font-semibold text-paper hover:bg-moss-deep transition-colors"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
                  className="w-full min-h-[32px] text-left text-xs text-ink-soft hover:text-ink transition-colors"
                >
                  {note
                    ? <span>{note.length > 50 ? note.slice(0, 50) + '...' : note}</span>
                    : <span className="text-ink-faint">Ajouter une note...</span>}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer légal — toujours visible, renforcé pour espèces dangereuses */}
      <div className="bg-danger px-3 py-3">
        <p className={`flex items-center justify-center gap-2 text-center font-bold text-paper uppercase leading-snug ${isDeadly ? 'text-xs tracking-tight' : 'text-[11px] tracking-tighter'}`}>
          {isDeadly
            ? <IconDanger size={16} className="flex-shrink-0" />
            : <span className="material-symbols-outlined text-[15px] flex-shrink-0">warning</span>}
          <span>
            {isDeadly
              ? 'DANGER MORTEL — Identification par un mycologue ou pharmacien OBLIGATOIRE avant toute consommation.'
              : 'Ne consommez JAMAIS sans l\'avis d\'un expert. En cas de doute, consultez un pharmacien.'}
          </span>
        </p>
      </div>
    </div>
  );
});
