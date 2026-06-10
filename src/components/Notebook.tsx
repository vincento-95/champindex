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

  return (
    <div className="space-y-3">
      {/* Species picker */}
      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-wider">Espèce</label>
        <select
          value={speciesId}
          onChange={e => setSpeciesId(e.target.value)}
          className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
            text-sm text-white/90 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Choisir une espèce...</option>
          {FORAGING_SPECIES.map(s => (
            <option key={s.id} value={s.id}>{s.emoji} {s.nom}</option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-wider">Lieu</label>
        <input
          type="text"
          value={locationName}
          onChange={e => setLocationName(e.target.value)}
          placeholder="Forêt de Fontainebleau..."
          className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
            text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Date + quantity */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
              text-sm text-white/90 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Quantité</label>
          <input
            type="text"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="~500g, 2 paniers..."
            className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
              text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-wider">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Sous les chênes, après 3 jours de pluie..."
          rows={3}
          className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10
            text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm text-white/60 hover:bg-white/10 transition-colors">
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
          className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-sm text-white font-medium
            hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Enregistrer
        </button>
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
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Mon carnet</h1>
          <div className="w-10" />
        </div>

        {/* Pill tabs (Stitch style) */}
        <div className="flex mt-5 gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                tab === t.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg" style={tab === t.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {t.matIcon}
              </span>
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Favoris ── */}
        {tab === 'favorites' && (
          <>
            {filteredFavorites.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <p className="text-4xl mb-3">❤️</p>
                <p className="text-sm">Aucun favori pour l'instant.</p>
                <p className="text-xs text-white/30 mt-1">Ouvrez une fiche espèce et appuyez sur le coeur.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFavorites.map(sp => (
                  <div key={sp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-2xl">{sp.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{sp.nom}</p>
                      <p className="text-xs text-white/40 italic truncate">{sp.latin}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(sp.id)}
                      className="text-red-400 hover:text-red-300 text-lg transition-colors"
                    >
                      ❤️
                    </button>
                  </div>
                ))}
              </div>
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
                  className="w-full py-3 rounded-xl bg-emerald-700/30 border border-emerald-500/20
                    text-sm text-emerald-300 font-medium hover:bg-emerald-700/50 transition-colors mb-4"
                >
                  + Ajouter une trouvaille
                </button>

                {finds.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <p className="text-4xl mb-3">📍</p>
                    <p className="text-sm">Aucune trouvaille enregistrée.</p>
                    <p className="text-xs text-white/30 mt-1">Enregistrez vos cueillettes pour vous souvenir des bons coins !</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {finds
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map(find => (
                      <div key={find.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{find.speciesEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/90 truncate">{find.speciesName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                              {find.locationName && <span>📍 {find.locationName}</span>}
                              <span>📅 {find.date}</span>
                              {find.quantity && <span>📦 {find.quantity}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFind(find.id)}
                            className="text-white/20 hover:text-red-400 text-sm transition-colors p-1"
                          >
                            🗑️
                          </button>
                        </div>
                        {find.notes && (
                          <p className="text-xs text-white/50 mt-2 pl-8 leading-relaxed">{find.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Notes ── */}
        {tab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-sm">Aucune note.</p>
                <p className="text-xs text-white/30 mt-1">Ouvrez une fiche espèce pour ajouter des notes personnelles.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(note => {
                    const sp = FORAGING_SPECIES.find(s => s.id === note.speciesId);
                    return (
                      <div key={note.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{sp?.emoji || '📝'}</span>
                          <p className="text-sm font-medium text-white/90">{note.speciesName}</p>
                          <span className="ml-auto text-[10px] text-white/30">
                            {new Date(note.updatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed pl-7">{note.content}</p>
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
