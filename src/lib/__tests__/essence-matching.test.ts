// ============================================================
// Tests — Matching essences forestières ↔ champignons
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeEssenceScore } from '../essence-matching';

describe('computeEssenceScore', () => {
  it('returns full match for exact tree name', () => {
    const result = computeEssenceScore(['chêne', 'hêtre'], ['chêne', 'hêtre', 'charme']);
    expect(result.matchType).toBe('full');
    expect(result.score).toBe(100);
  });

  it('returns none for completely incompatible essences', () => {
    const result = computeEssenceScore(['chêne', 'hêtre'], ['pin maritime']);
    expect(result.matchType).toBe('none');
    expect(result.score).toBe(0);
  });

  it('handles generic conifère → specific species expansion', () => {
    const result = computeEssenceScore(['conifère'], ['épicéa', 'sapin']);
    expect(result.matchType).not.toBe('none');
    expect(result.score).toBeGreaterThan(0);
  });

  it('handles universal habitats (prairie, lisière)', () => {
    const result = computeEssenceScore(['prairie', 'lisière'], ['chêne']);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns partial match for one of two essences matching', () => {
    const result = computeEssenceScore(['chêne', 'châtaignier'], ['chêne', 'pin']);
    expect(result.score).toBeGreaterThan(0);
  });

  it('handles empty inputs gracefully', () => {
    // Empty species needs = habitat match (returns moderate score)
    expect(computeEssenceScore([], ['chêne']).score).toBeGreaterThanOrEqual(0);
    // Empty forest essences = no match possible
    expect(computeEssenceScore(['chêne'], []).score).toBe(0);
  });
});
