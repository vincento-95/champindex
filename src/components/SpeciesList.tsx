// ============================================================
// ChampIndex — Liste des espèces en saison avec recherche
// ============================================================

import { memo, useState, useMemo, type ComponentType } from 'react';
import type { ForagingSpecies, ForagingCategory } from '../types';
import { useFavorites, useNotes } from '../hooks/useNotebook';
import SpeciesCard from './SpeciesCard';
import SafetyWarning from './SafetyWarning';
import { IconMushroom, IconPlant, IconBerry } from './Icons';

interface SpeciesListProps {
  species: ForagingSpecies[];
  selectedCategory: ForagingCategory;
}

const MONTH_NAMES = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type EmptyIconComponent = ComponentType<{ size?: number; className?: string }>;

const CATEGORY_LABELS: Record<ForagingCategory, { title: string; EmptyIcon: EmptyIconComponent; emptyText: string; searchPlaceholder: string }> = {
  mushroom: { title: 'Champignons attendus', EmptyIcon: IconMushroom, emptyText: 'Peu de champignons attendus en cette saison avec ces conditions.', searchPlaceholder: 'Rechercher un champignon...' },
  plant: { title: 'Plantes en saison', EmptyIcon: IconPlant, emptyText: 'Peu de plantes comestibles en cette saison.', searchPlaceholder: 'Rechercher une plante...' },
  berry: { title: 'Baies & fruits en saison', EmptyIcon: IconBerry, emptyText: 'Peu de baies ou fruits sauvages en cette saison.', searchPlaceholder: 'Rechercher une baie ou fruit...' },
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default memo(function SpeciesList({ species, selectedCategory }: SpeciesListProps) {
  const month = new Date().getMonth() + 1;
  const [search, setSearch] = useState('');
  const labels = CATEGORY_LABELS[selectedCategory];
  const EmptyIcon = labels.EmptyIcon;

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
      <h3 className="text-lg font-bold font-display text-ink mb-3">
        {labels.title} en {MONTH_NAMES[month]}
      </h3>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-lg pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-paper-raised border border-line
            text-sm text-ink placeholder:text-ink-faint
            focus:outline-none focus:border-moss transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Effacer la recherche"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-ink-faint hover:text-ink transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Compteur résultats */}
      {search && (
        <p className="text-[11px] text-ink-faint mb-3">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour "{search}"
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-faint">
          {search ? (
            <span className="material-symbols-outlined text-4xl mb-3 block">search_off</span>
          ) : (
            <EmptyIcon size={40} className="mx-auto mb-3" />
          )}
          <p className="text-sm">{search ? `Aucune espèce trouvée pour "${search}"` : labels.emptyText}</p>
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
