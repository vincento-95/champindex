// ============================================================
// ChampIndex — Explorateur d'habitats
// ============================================================

import { useState, useMemo } from 'react';
import { HABITATS, type Habitat } from '../lib/habitats-db';
import type { ForagingCategory } from '../types';
import { IconMushroom, IconPlant, IconBerry } from './Icons';

interface HabitatExplorerProps {
  onBack: () => void;
  selectedCategory: ForagingCategory;
}

// ── Icône Material par type d'habitat ──

function getHabitatIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('marais') || n.includes('tourbière') || n.includes('ripisylve')) return 'water_drop';
  if (n.includes('littoral') || n.includes('estran') || n.includes('dune') || n.includes('salin')) return 'waves';
  if (n.includes('prairie') || n.includes('pelouse') || n.includes('alpage') || n.includes('pré ')) return 'grass';
  if (n.includes('garrigue') || n.includes('maquis')) return 'sunny';
  if (n.includes('lande') || n.includes('friche')) return 'eco';
  if (n.includes('verger') || n.includes('haie') || n.includes('bocage')) return 'park';
  return 'forest';
}

// ── Contenu espèces par catégorie ──

function getSpeciesContent(habitat: Habitat, category: ForagingCategory): string {
  if (category === 'mushroom') return habitat.mushroomsFound;
  if (category === 'plant') return habitat.plantsFound;
  return habitat.berriesFound;
}

function hasContent(habitat: Habitat, category: ForagingCategory): boolean {
  const content = getSpeciesContent(habitat, category);
  return !!content && content.length > 0;
}

// ── Composant principal ──

export default function HabitatExplorer({ onBack, selectedCategory }: HabitatExplorerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHabitats = useMemo(
    () => HABITATS.filter(h => hasContent(h, selectedCategory)),
    [selectedCategory],
  );

  const categoryLabel = selectedCategory === 'mushroom' ? 'Champignons'
    : selectedCategory === 'plant' ? 'Plantes' : 'Baies & fruits';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-line">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-ink
            bg-paper-raised border border-line-strong hover:bg-paper-deep transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Retour
        </button>
        <h2 className="font-display text-lg font-bold text-ink">
          Habitats
        </h2>
        <span className="text-xs text-ink-faint">{filteredHabitats.length} milieux</span>
      </header>

      {/* Category indicator */}
      <div className="px-4 py-2 text-[10px] text-ink-faint uppercase tracking-[0.18em]">
        {categoryLabel} par habitat
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="space-y-2">
          {filteredHabitats.map(habitat => {
            const icon = getHabitatIcon(habitat.name);
            const isExpanded = expandedId === habitat.id;
            const content = getSpeciesContent(habitat, selectedCategory);

            return (
              <button
                key={habitat.id}
                onClick={() => setExpandedId(isExpanded ? null : habitat.id)}
                className="w-full text-left rounded-2xl bg-paper-raised border border-line
                  hover:border-line-strong transition-all overflow-hidden"
              >
                {/* Compact header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-moss-wash flex items-center justify-center">
                    <span className="material-symbols-outlined text-moss text-xl">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-semibold text-ink truncate">{habitat.name}</p>
                    <p className="text-[11px] text-ink-faint truncate">{habitat.vegetation}</p>
                  </div>
                  {habitat.altitudeRange && (
                    <span className="flex items-center gap-0.5 text-[10px] text-ink-faint flex-shrink-0">
                      <span className="material-symbols-outlined text-sm">landscape</span>
                      {habitat.altitudeRange}
                    </span>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2.5 border-t border-line pt-3">
                    {/* Sol */}
                    {habitat.soilType && (
                      <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                        <span className="material-symbols-outlined text-sm text-ink-faint">grain</span>
                        {habitat.soilType}
                      </p>
                    )}

                    {/* Régions */}
                    {habitat.regions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {habitat.regions.map(r => (
                          <span key={r} className="px-2 py-0.5 rounded-full bg-paper-deep text-[10px] text-ink-soft">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Espèces pour la catégorie sélectionnée */}
                    {content && (
                      <div className="rounded-xl bg-paper-deep p-3">
                        <p className="text-[10px] text-ink-faint uppercase tracking-[0.18em] mb-1.5">
                          {categoryLabel} à trouver
                        </p>
                        <p className="text-xs text-ink leading-relaxed">{content}</p>
                      </div>
                    )}

                    {/* Aperçu des autres catégories */}
                    {selectedCategory !== 'mushroom' && habitat.mushroomsFound && (
                      <p className="flex items-start gap-1.5 text-[10px] text-ink-faint">
                        <IconMushroom size={12} className="shrink-0 mt-px" />
                        <span>{habitat.mushroomsFound.length > 60 ? habitat.mushroomsFound.slice(0, 60) + '...' : habitat.mushroomsFound}</span>
                      </p>
                    )}
                    {selectedCategory !== 'plant' && habitat.plantsFound && (
                      <p className="flex items-start gap-1.5 text-[10px] text-ink-faint">
                        <IconPlant size={12} className="shrink-0 mt-px" />
                        <span>{habitat.plantsFound.length > 60 ? habitat.plantsFound.slice(0, 60) + '...' : habitat.plantsFound}</span>
                      </p>
                    )}
                    {selectedCategory !== 'berry' && habitat.berriesFound && (
                      <p className="flex items-start gap-1.5 text-[10px] text-ink-faint">
                        <IconBerry size={12} className="shrink-0 mt-px" />
                        <span>{habitat.berriesFound.length > 60 ? habitat.berriesFound.slice(0, 60) + '...' : habitat.berriesFound}</span>
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
