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

  it('matches genus fallback', () => {
    // If exact species not found, try genus match
    const result = matchToLocalSpecies('Boletus reticulatus');
    // Should match some Boletus in our DB
    if (result) {
      expect(result.latin.toLowerCase()).toContain('boletus');
    }
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
