// ============================================================
// ChampIndex — Carnet de cueillette
// ============================================================

import { useState } from 'react';
import { useFavorites, useFinds, useNotes, type ForagingFind } from '../hooks/useNotebook';
import { FORAGING_SPECIES } from '../lib/foraging-db';
import type { ForagingCategory } from '../types';

interface NotebookProps {
  onBack: () => void;
  selectedCategory: ForagingCategory;
}

type NotebookTab = 'favorites' | 'finds' | 'notes';

// ── Helpers ──

function formatFindDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Formulaire "J'ai trouvé" ──

function FindForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<ForagingFind, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [speciesId, setSpeciesId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('');

  const species = FORAGING_SPECIES.find(s => s.id === speciesId);

  const fieldClass = `w-full bg-white/5 border border-white/10 rounded-xl text-sm text-white/90
    placeholder:text-white/25 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent`;
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-white/40 mb-1';

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      {/* Form header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold">Nouvelle trouvaille</h2>
        <button
          onClick={onCancel}
          className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label="Fermer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Species picker */}
        <div>
          <label className={labelClass}>Espèce</label>
          <select
            value={speciesId}
            onChange={e => setSpeciesId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Choisir une espèce...</option>
            {FORAGING_SPECIES.map(s => (
              <option key={s.id} value={s.id}>{s.emoji} {s.nom}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className={labelClass}>Lieu</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg pointer-events-none">
              location_on
            </span>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="Ex : Forêt de Fontainebleau"
              className={`${fieldClass} pl-10`}
            />
          </div>
        </div>

        {/* Date + quantity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantité</label>
            <input
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Ex : 500g"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Conditions météo, sol, environnement..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/5 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (!speciesId) return;
              onSubmit({
                speciesId,
                speciesName: species?.nom || speciesId,
                speciesEmoji: species?.emoji || '🍄',
                lat: 0, lon: 0,
                locationName,
                date,
                notes,
                quantity,
              });
            }}
            disabled={!speciesId}
            className="flex-[2] py-3 rounded-xl bg-[#ec5b13] text-sm text-white font-bold
              hover:bg-[#d95210] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ──

export default function Notebook({ onBack, selectedCategory }: NotebookProps) {
  const [tab, setTab] = useState<NotebookTab>('favorites');
  const [showAddFind, setShowAddFind] = useState(false);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { finds, addFind, deleteFind } = useFinds();
  const { notes } = useNotes();

  const favoriteSpecies = FORAGING_SPECIES.filter(s => isFavorite(s.id));
  const filteredFavorites = selectedCategory === 'mushroom'
    ? favoriteSpecies.filter(s => s.category === 'mushroom')
    : selectedCategory === 'plant'
    ? favoriteSpecies.filter(s => s.category === 'plant')
    : favoriteSpecies.filter(s => s.category === 'berry');

  const tabs: { id: NotebookTab; label: string; matIcon: string; count: number }[] = [
    { id: 'favorites', label: 'Favoris', matIcon: 'favorite', count: favorites.length },
    { id: 'finds', label: 'Trouvailles', matIcon: 'location_on', count: finds.length },
    { id: 'notes', label: 'Notes', matIcon: 'edit_note', count: notes.length },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header (Stitch style) */}
      <header className="sticky top-0 z-10 bg-[#1a2215]/95 backdrop-blur-md border-b border-white/10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Mon carnet</h1>
          <div className="w-10" />
        </div>

        {/* Pill tabs (Stitch style) */}
        <div className="flex mt-6 gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 min-h-11 rounded-full text-sm whitespace-nowrap transition-all active:scale-95 ${
                tab === t.id
                  ? 'bg-[#ec5b13] text-white font-semibold'
                  : 'bg-white/5 text-white/50 font-medium hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg" style={tab === t.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {t.matIcon}
              </span>
              {t.label}
              {tab === t.id && t.count > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Favoris ── */}
        {tab === 'favorites' && (
          <>
            {filteredFavorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 opacity-40">
                <span className="text-6xl mb-4">❤️</span>
                <p className="text-sm font-medium">Aucun favori pour l'instant.</p>
                <p className="text-xs max-w-[220px] mt-1">Ouvrez une fiche espèce et appuyez sur le coeur.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Mes Favoris</h3>
                  <span className="text-xs text-white/40 uppercase font-bold tracking-wider">
                    {filteredFavorites.length} espèce{filteredFavorites.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredFavorites.map(sp => (
                    <div key={sp.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-[#ec5b13]/10 flex items-center justify-center text-3xl">
                        {sp.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base truncate">{sp.nom}</h4>
                        <p className="text-xs italic text-white/40 truncate">{sp.latin}</p>
                      </div>
                      <button
                        onClick={() => toggleFavorite(sp.id)}
                        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-[#ec5b13] hover:bg-white/5 transition-colors"
                        aria-label={`Retirer ${sp.nom} des favoris`}
                      >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                          favorite
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Trouvailles ── */}
        {tab === 'finds' && (
          <>
            {showAddFind ? (
              <FindForm
                onSubmit={async (data) => {
                  await addFind(data);
                  setShowAddFind(false);
                }}
                onCancel={() => setShowAddFind(false)}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowAddFind(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600/20
                    border-2 border-dashed border-emerald-500/30 text-emerald-400 text-sm font-bold
                    hover:bg-emerald-600/30 transition-colors mb-2"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Ajouter une trouvaille
                </button>

                {finds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 opacity-40">
                    <span className="text-6xl mb-4">📍</span>
                    <p className="text-sm font-medium">Aucune trouvaille enregistrée.</p>
                    <p className="text-xs max-w-[220px] mt-1">Enregistrez vos cueillettes pour vous souvenir des bons coins !</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-lg pt-2">Dernières trouvailles</h3>
                    <div className="space-y-4 mt-3">
                      {finds
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map(find => (
                        <div key={find.id} className="p-4 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                          <div className="flex gap-4">
                            <div className="text-3xl">{find.speciesEmoji}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold truncate">{find.speciesName}</h4>
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                                {find.locationName && (
                                  <div className="flex items-center gap-1 text-xs text-white/40 min-w-0">
                                    <span className="material-symbols-outlined text-sm shrink-0">location_on</span>
                                    <span className="truncate">{find.locationName}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-white/40">
                                  <span className="material-symbols-outlined text-sm shrink-0">calendar_today</span>
                                  {formatFindDate(find.date)}
                                </div>
                              </div>
                              {find.quantity && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/50">
                                    Quantité : {find.quantity}
                                  </span>
                                </div>
                              )}
                              {find.notes && (
                                <p className="mt-2 text-sm text-white/50 italic leading-relaxed">
                                  "{find.notes}"
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteFind(find.id)}
                              className="w-11 h-11 -mr-2 -mt-2 shrink-0 flex items-center justify-center rounded-full
                                text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
                              aria-label={`Supprimer la trouvaille ${find.speciesName}`}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Notes ── */}
        {tab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 opacity-40">
                <span className="text-6xl mb-4">📓</span>
                <p className="text-sm font-medium">Aucune note.</p>
                <p className="text-xs max-w-[220px] mt-1">Ouvrez une fiche espèce pour ajouter des notes personnelles.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(note => {
                    const sp = FORAGING_SPECIES.find(s => s.id === note.speciesId);
                    return (
                      <div key={note.id} className="p-4 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-[#ec5b13]/10 flex items-center justify-center text-xl">
                            {sp?.emoji || '📝'}
                          </div>
                          <h4 className="font-bold text-sm flex-1 min-w-0 truncate">{note.speciesName}</h4>
                          <span className="text-[10px] text-white/30 shrink-0">
                            {new Date(note.updatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">{note.content}</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
