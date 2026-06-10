// ============================================================
// ChampIndex — Explorateur d'habitats
// ============================================================

import { useState, useMemo } from 'react';
import { HABITATS, type Habitat } from '../lib/habitats-db';
import type { ForagingCategory } from '../types';

interface HabitatExplorerProps {
  onBack: () => void;
  selectedCategory: ForagingCategory;
}

// ── Emoji par type d'habitat ──

function getHabitatEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('marais') || n.includes('tourbière') || n.includes('ripisylve')) return '💧';
  if (n.includes('littoral') || n.includes('estran') || n.includes('dune') || n.includes('salin')) return '🌊';
  if (n.includes('prairie') || n.includes('pelouse') || n.includes('alpage') || n.includes('pré ')) return '🌾';
  if (n.includes('garrigue') || n.includes('maquis')) return '☀️';
  if (n.includes('lande') || n.includes('friche')) return '🌿';
  if (n.includes('verger') || n.includes('haie') || n.includes('bocage')) return '🌳';
  return '🌲';
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

  const categoryLabel = selectedCategory === 'mushroom' ? '🍄 Champignons'
    : selectedCategory === 'plant' ? '🌿 Plantes' : '🫐 Baies & fruits';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70
            bg-white/5 hover:bg-white/10 transition-colors"
        >
          ← Retour
        </button>
        <h2
          className="text-lg font-bold text-white/90"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Habitats
        </h2>
        <span className="text-xs text-white/40">{filteredHabitats.length} milieux</span>
      </header>

      {/* Category indicator */}
      <div className="px-4 py-2 text-[10px] text-white/40 uppercase tracking-wider">
        {categoryLabel} par habitat
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="space-y-2">
          {filteredHabitats.map(habitat => {
            const emoji = getHabitatEmoji(habitat.name);
            const isExpanded = expandedId === habitat.id;
            const content = getSpeciesContent(habitat, selectedCategory);

            return (
              <button
                key={habitat.id}
                onClick={() => setExpandedId(isExpanded ? null : habitat.id)}
                className="w-full text-left rounded-2xl bg-white/5 border border-white/5
                  hover:bg-white/[0.07] transition-all overflow-hidden"
              >
                {/* Compact header */}
                <div className="p-4 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{habitat.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{habitat.vegetation}</p>
                  </div>
                  {habitat.altitudeRange && (
                    <span className="text-[10px] text-white/30 flex-shrink-0">
                      ⛰️ {habitat.altitudeRange}
                    </span>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2.5 border-t border-white/5 pt-3">
                    {/* Sol */}
                    {habitat.soilType && (
                      <p className="text-[11px] text-white/50">
                        🪨 {habitat.soilType}
                      </p>
                    )}

                    {/* Régions */}
                    {habitat.regions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {habitat.regions.map(r => (
                          <span key={r} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/40">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Espèces pour la catégorie sélectionnée */}
                    {content && (
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                          {categoryLabel} à trouver
                        </p>
                        <p className="text-xs text-white/80 leading-relaxed">{content}</p>
                      </div>
                    )}

                    {/* Aperçu des autres catégories */}
                    {selectedCategory !== 'mushroom' && habitat.mushroomsFound && (
                      <p className="text-[10px] text-white/30">
                        🍄 {habitat.mushroomsFound.length > 60 ? habitat.mushroomsFound.slice(0, 60) + '...' : habitat.mushroomsFound}
                      </p>
                    )}
                    {selectedCategory !== 'plant' && habitat.plantsFound && (
                      <p className="text-[10px] text-white/30">
                        🌿 {habitat.plantsFound.length > 60 ? habitat.plantsFound.slice(0, 60) + '...' : habitat.plantsFound}
                      </p>
                    )}
                    {selectedCategory !== 'berry' && habitat.berriesFound && (
                      <p className="text-[10px] text-white/30">
                        🫐 {habitat.berriesFound.length > 60 ? habitat.berriesFound.slice(0, 60) + '...' : habitat.berriesFound}
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
