// ============================================================
// ChampIndex — Hooks pour le carnet de cueillette
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { dbGetAll, dbPut, dbDelete } from '../lib/storage';

// ── Types ──

export interface Favorite {
  id: string; // = speciesId
  addedAt: number;
}

export interface ForagingFind {
  id: string; // UUID
  speciesId: string;
  speciesName: string;
  speciesEmoji: string;
  lat: number;
  lon: number;
  locationName: string;
  date: string; // ISO date
  notes: string;
  quantity: string;
  createdAt: number;
}

export interface UserNote {
  id: string; // = speciesId
  speciesId: string;
  speciesName: string;
  content: string;
  updatedAt: number;
}

// ── Favorites ──

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dbGetAll<Favorite>('favorites').then(data => {
      setFavorites(data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const isFavorite = useCallback(
    (speciesId: string) => favorites.some(f => f.id === speciesId),
    [favorites],
  );

  const toggleFavorite = useCallback(async (speciesId: string) => {
    const existing = favorites.find(f => f.id === speciesId);
    if (existing) {
      await dbDelete('favorites', speciesId);
      setFavorites(prev => prev.filter(f => f.id !== speciesId));
    } else {
      const fav: Favorite = { id: speciesId, addedAt: Date.now() };
      await dbPut('favorites', fav);
      setFavorites(prev => [...prev, fav]);
    }
  }, [favorites]);

  return { favorites, loaded, isFavorite, toggleFavorite };
}

// ── Finds ──

export function useFinds() {
  const [finds, setFinds] = useState<ForagingFind[]>([]);

  useEffect(() => {
    dbGetAll<ForagingFind>('finds').then(setFinds).catch(() => {});
  }, []);

  const addFind = useCallback(async (find: Omit<ForagingFind, 'id' | 'createdAt'>) => {
    const entry: ForagingFind = {
      ...find,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await dbPut('finds', entry);
    setFinds(prev => [entry, ...prev]);
    return entry;
  }, []);

  const deleteFind = useCallback(async (id: string) => {
    await dbDelete('finds', id);
    setFinds(prev => prev.filter(f => f.id !== id));
  }, []);

  return { finds, addFind, deleteFind };
}

// ── Notes ──

export function useNotes() {
  const [notes, setNotes] = useState<UserNote[]>([]);

  useEffect(() => {
    dbGetAll<UserNote>('notes').then(setNotes).catch(() => {});
  }, []);

  const saveNote = useCallback(async (speciesId: string, speciesName: string, content: string) => {
    if (!content.trim()) {
      await dbDelete('notes', speciesId);
      setNotes(prev => prev.filter(n => n.id !== speciesId));
      return;
    }
    const entry: UserNote = { id: speciesId, speciesId, speciesName, content, updatedAt: Date.now() };
    await dbPut('notes', entry);
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === speciesId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  const getNote = useCallback(
    (speciesId: string) => notes.find(n => n.id === speciesId),
    [notes],
  );

  return { notes, saveNote, getNote };
}
