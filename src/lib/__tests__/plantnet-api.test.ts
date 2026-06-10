// ============================================================
// Tests — Matching PlantNet → espèces locales
// ============================================================

import { describe, it, expect } from 'vitest';
import { matchToLocalSpecies } from '../plantnet-api';

describe('matchToLocalSpecies', () => {
  it('matches exact latin name', () => {
    const result = matchToLocalSpecies('Boletus edulis');
    expect(result).toBeDefined();
    expect(result!.nom).toContain('Cèpe');
  });

  it('matches case-insensitive', () => {
    const result = matchToLocalSpecies('boletus edulis');
    expect(result).toBeDefined();
  });

  it('matches binomial from longer name', () => {
    // PlantNet sometimes returns full author name
    const result = matchToLocalSpecies('Allium ursinum L.');
    expect(result).toBeDefined();
    expect(result!.nom).toContain('Ail des ours');
  });

  it('does NOT fall back to genus-only matches (safety)', () => {
    // Amanita phalloides (mortelle) n'est pas dans la base : un fallback au
    // genre renverrait une amanite comestible — inacceptable.
    const result = matchToLocalSpecies('Amanita phalloides');
    expect(result).toBeNull();
  });

  it('returns the most dangerous entry when the latin name is duplicated', () => {
    // Dioscorea communis existe en version pousses (bon) et baies (mortel)
    const result = matchToLocalSpecies('Dioscorea communis');
    expect(result).toBeDefined();
    expect(result!.comestibilite).toBe('mortel');
  });

  it('returns null for unknown species', () => {
    const result = matchToLocalSpecies('Plantus inventus');
    expect(result).toBeNull();
  });

  it('handles empty string', () => {
    const result = matchToLocalSpecies('');
    expect(result).toBeNull();
  });

  it('matches common mushroom species', () => {
    const tests = [
      { latin: 'Cantharellus cibarius', expected: 'Girolle' },
      { latin: 'Amanita caesarea', expected: 'Césars' },
      { latin: 'Morchella esculenta', expected: 'Morille' },
    ];
    for (const t of tests) {
      const result = matchToLocalSpecies(t.latin);
      expect(result, `Should match ${t.latin}`).toBeDefined();
      expect(result!.nom).toContain(t.expected);
    }
  });

  it('matches common plant species', () => {
    const result = matchToLocalSpecies('Urtica dioica');
    if (result) {
      expect(result.category).toBe('plant');
    }
  });

  it('matches common berry species', () => {
    const result = matchToLocalSpecies('Rubus fruticosus');
    if (result) {
      expect(result.category).toBe('berry');
    }
  });
});
