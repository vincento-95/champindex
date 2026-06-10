// ============================================================
// ChampIndex — Liste des espèces en saison avec recherche
// ============================================================

import { memo, useState, useMemo } from 'react';
import type { ForagingSpecies, ForagingCategory } from '../types';
import { useFavorites, useNotes } from '../hooks/useNotebook';
import SpeciesCard from './SpeciesCard';
import SafetyWarning from './SafetyWarning';

interface SpeciesListProps {
  species: ForagingSpecies[];
  selectedCategory: ForagingCategory;
}

const MONTH_NAMES = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const CATEGORY_LABELS: Record<ForagingCategory, { title: string; emptyEmoji: string; emptyText: string; searchPlaceholder: string }> = {
  mushroom: { title: 'Champignons attendus', emptyEmoji: '🍂', emptyText: 'Peu de champignons attendus en cette saison avec ces conditions.', searchPlaceholder: 'Rechercher un champignon...' },
  plant: { title: 'Plantes en saison', emptyEmoji: '🌱', emptyText: 'Peu de plantes comestibles en cette saison.', searchPlaceholder: 'Rechercher une plante...' },
  berry: { title: 'Baies & fruits en saison', emptyEmoji: '🍃', emptyText: 'Peu de baies ou fruits sauvages en cette saison.', searchPlaceholder: 'Rechercher une baie ou fruit...' },
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default memo(function SpeciesList({ species, selectedCategory }: SpeciesListProps) {
  const month = new Date().getMonth() + 1;
  const [search, setSearch] = useState('');
  const labels = CATEGORY_LABELS[selectedCategory];

  const { isFavorite, toggleFavorite } = useFavorites();
  const { getNote, saveNote } = useNotes();

  const filtered = useMemo(() => {
    let list = species.filter(s => s.category === selectedCategory);
    if (search.trim()) {
      const q = normalize(search.trim());
      list = list.filter(s =>
        normalize(s.nom).includes(q) ||
        normalize(s.latin).includes(q) ||
        (s.partiesComestibles && normalize(s.partiesComestibles).includes(q)) ||
        s.essences.some(e => normalize(e).includes(q)) ||
        s.habitats.some(h => normalize(h.replace(/_/g, ' ')).includes(q))
      );
    }
    return list;
  }, [species, selectedCategory, search]);

  return (
    <div className="px-4 py-4">
      <h3
        className="text-lg font-bold text-white/90 mb-3"
        style={{ fontFamily: 'Playfair Display, serif' }}
      >
        {labels.title} en {MONTH_NAMES[month]}
      </h3>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10
            text-sm text-white/90 placeholder:text-white/25
            focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm"
          >
            &times;
          </button>
        )}
      </div>

      {/* Compteur résultats */}
      {search && (
        <p className="text-[11px] text-white/40 mb-3">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour "{search}"
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <p className="text-4xl mb-3">{search ? '🔍' : labels.emptyEmoji}</p>
          <p>{search ? `Aucune espèce trouvée pour "${search}"` : labels.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SpeciesCard
              key={s.id}
              species={s}
              isFavorite={isFavorite(s.id)}
              onToggleFavorite={toggleFavorite}
              note={getNote(s.id)?.content}
              onSaveNote={saveNote}
            />
          ))}
        </div>
      )}

      {/* Avertissement sécurité */}
      <SafetyWarning />
    </div>
  );
});
