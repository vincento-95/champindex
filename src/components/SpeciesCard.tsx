// ============================================================
// ChampIndex — Fiche espèce foraging (champignon, plante, baie)
// ============================================================

import { useState, memo } from 'react';
import type { ForagingSpecies, SeasonDetail, ConfusionDangerLevel } from '../types';
import SpeciesPhoto from './SpeciesPhoto';

interface SpeciesCardProps {
  species: ForagingSpecies;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  note?: string;
  onSaveNote?: (speciesId: string, speciesName: string, content: string) => void;
}

// ── Couleurs pluie ──

const rainColors: Record<string, string> = {
  'faible': 'bg-blue-400/20 text-blue-300',
  'modéré': 'bg-cyan-400/20 text-cyan-300',
  'élevé': 'bg-indigo-400/20 text-indigo-300',
  'très élevé': 'bg-violet-400/20 text-violet-300',
};

// ── Badge danger confusion ──

const dangerBadge: Record<ConfusionDangerLevel, { label: string; className: string }> = {
  tres_faible: { label: 'Confusion faible', className: 'bg-emerald-500/20 text-emerald-300' },
  faible: { label: 'Confusion faible', className: 'bg-emerald-500/20 text-emerald-300' },
  moyen: { label: 'Confusion possible', className: 'bg-amber-500/20 text-amber-300' },
  eleve: { label: 'Confusion dangereuse', className: 'bg-red-500/20 text-red-300' },
  tres_eleve: { label: 'Confusion dangereuse', className: 'bg-red-500/20 text-red-300' },
  mortel: { label: 'MORTEL', className: 'bg-red-600/30 text-red-400 animate-pulse' },
};

// ── Mini calendrier ──

const MONTH_KEYS: (keyof SeasonDetail)[] = [
  'jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec',
];
const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

function MiniCalendar({ saisonDetail }: { saisonDetail: SeasonDetail }) {
  return (
    <div className="flex gap-px">
      {MONTH_KEYS.map((key, i) => {
        const intensity = saisonDetail[key];
        const bg =
          intensity === 'peak' ? 'bg-amber-500'
          : intensity === 'season' ? 'bg-emerald-600'
          : 'bg-white/10';
        return (
          <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
            <div className={`w-full h-2 rounded-[2px] ${bg}`} />
            <span className="text-[8px] text-white/30 leading-none">{MONTH_LABELS[i]}</span>
          </div>
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

  const isDeadly = species.dangerConfusion === 'mortel' || species.comestibilite === 'mortel';
  const isToxic = species.comestibilite === 'toxique' || species.dangerConfusion === 'tres_eleve';

  return (
    <div className={`rounded-2xl bg-white/5 backdrop-blur-sm overflow-hidden transition-all ${
      isDeadly ? 'border-2 border-red-500/50' : isToxic ? 'border border-amber-500/30' : 'border border-white/5'
    }`}>
      {/* Bandeau mortel — impossible à rater */}
      {isDeadly && (
        <div className="bg-red-700/80 px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">☠️</span>
          <div>
            <p className="text-xs font-bold text-white">ESPÈCE MORTELLE</p>
            <p className="text-[10px] text-red-200">Ne JAMAIS consommer. Confusion potentiellement fatale.</p>
          </div>
        </div>
      )}

      {/* Bandeau toxique */}
      {isToxic && !isDeadly && (
        <div className="bg-amber-800/60 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-[11px] font-medium text-amber-200">Espèce toxique ou à confusion très dangereuse</p>
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
              className="text-lg flex-shrink-0 transition-transform active:scale-125"
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}

          {/* Photo ou emoji — zone agrandie (Stitch) */}
          <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <SpeciesPhoto speciesId={species.id} emoji={species.emoji} nom={species.nom} size="md" />
          </div>

          {/* Nom + latin */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/90 truncate">{species.nom}</p>
            <p className="text-xs text-white/40 italic truncate">{species.latin}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>
              {species.dangerConfusion === 'mortel' ? '☠️ ' : species.dangerConfusion === 'eleve' || species.dangerConfusion === 'tres_eleve' ? '⚠️ ' : ''}
              {badge.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${rainColors[species.besoinPluie] || ''}`}>
              💧 {species.besoinPluie}
            </span>
          </div>
        </div>

        {/* Parties comestibles (plantes & baies) */}
        {species.partiesComestibles && (
          <p className="text-[11px] text-emerald-400/70 mt-2 ml-13 pl-[52px]">
            🍽️ {species.partiesComestibles}
          </p>
        )}

        {/* Mini calendrier */}
        <div className="mt-3">
          <MiniCalendar saisonDetail={species.saisonDetail} />
        </div>
      </button>

      {/* Section dépliable */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Description */}
          {species.description && (
            <p className="text-xs text-white/60 leading-relaxed">{species.description}</p>
          )}

          {/* Habitats */}
          {species.habitats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {species.habitats.map(h => (
                <span key={h} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/50">
                  {h.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Essences */}
          {species.essences.length > 0 && (
            <p className="text-[11px] text-white/40">
              🌳 {species.essences.join(', ')}
            </p>
          )}

          {/* Conseils cueillette */}
          {species.conseilsCueillette && (
            <p className="text-xs text-amber-300/70 leading-relaxed">
              💡 {species.conseilsCueillette}
            </p>
          )}

          {/* Usages culinaires */}
          {species.usagesCulinaires && (
            <p className="text-xs text-white/50 leading-relaxed">
              👨‍🍳 {species.usagesCulinaires}
            </p>
          )}

          {/* Confusions possibles */}
          {species.confusions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                Confusions possibles
              </p>
              {species.confusions.map((c, i) => {
                const dangerColor =
                  c.danger === 'mortel' ? 'border-red-500/40 bg-red-500/10'
                  : c.danger === 'toxique' ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-white/10 bg-white/5';
                const dangerIcon =
                  c.danger === 'mortel' ? '☠️'
                  : c.danger === 'toxique' ? '⚠️'
                  : 'ℹ️';
                return (
                  <div key={i} className={`rounded-lg border p-2.5 ${dangerColor}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{dangerIcon}</span>
                      <span className="text-xs font-medium text-white/80">{c.espece}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        c.danger === 'mortel' ? 'bg-red-600/30 text-red-300'
                        : c.danger === 'toxique' ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-white/10 text-white/50'
                      }`}>
                        {c.danger}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{c.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Avertissement spécifique */}
          {species.avertissement && (
            <div className="rounded-lg bg-red-900/30 border border-red-500/20 p-2.5">
              <p className="text-xs text-red-300 leading-relaxed">⚠️ {species.avertissement}</p>
            </div>
          )}

          {/* Notes personnelles */}
          {onSaveNote && (
            <div className="pt-1">
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
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-[11px] text-white/50 hover:bg-white/10"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSaveNote(species.id, species.nom, noteText); setEditingNote(false); }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700/50 text-[11px] text-emerald-200 hover:bg-emerald-700/70"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                >
                  <span>📝</span>
                  {note ? <span className="text-white/50">{note.length > 50 ? note.slice(0, 50) + '...' : note}</span> : <span>Ajouter une note...</span>}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer légal — toujours visible, renforcé pour espèces dangereuses */}
      <div className={`px-3 py-2 ${isDeadly || isToxic ? 'bg-red-900/40' : 'bg-red-900/20'}`}>
        <p className={`text-center leading-tight ${isDeadly ? 'text-xs text-red-300 font-medium' : 'text-[10px] text-red-200/80'}`}>
          {isDeadly
            ? '☠️ DANGER MORTEL — Identification par un mycologue ou pharmacien OBLIGATOIRE avant toute consommation.'
            : '⚠️ Ne consommez JAMAIS sans l\'avis d\'un expert. En cas de doute, consultez un pharmacien.'}
        </p>
      </div>
    </div>
  );
});
