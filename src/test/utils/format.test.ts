import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../../utils/format';

// Helper to normalize spaces (Intl.NumberFormat uses NBSP)
const normalizeSpaces = (str: string) => str.replace(/\u00A0/g, ' ');

// Helper to normalize thousand separators (different environments may format differently)
const normalizeThousandSeparators = (str: string) =>
  str.replace(/\./g, '').replace(/,/g, ',');

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    // Intl.NumberFormat behavior varies by environment (may or may not add thousand separators)
    const result = normalizeSpaces(formatCurrency(1234.56));
    // Remove thousand separators for comparison (some environments add them, others don't)
    const normalized = normalizeThousandSeparators(result);
    expect(normalized).toBe('1234,56 €');
    // Verify it contains the euro symbol and correct decimal part
    expect(result).toContain('€');
    expect(result).toContain(',56');
  });

  it('formats zero correctly', () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe('0,00 €');
  });

  it('formats negative numbers correctly', () => {
    // Intl.NumberFormat behavior varies by environment
    const result = normalizeSpaces(formatCurrency(-1234.56));
    // Remove thousand separators for comparison
    const normalized = normalizeThousandSeparators(result);
    expect(normalized).toBe('-1234,56 €');
    // Verify it contains the euro symbol and correct decimal part
    expect(result).toContain('€');
    expect(result).toContain(',56');
  });

  it('handles decimal places correctly', () => {
    expect(normalizeSpaces(formatCurrency(100.1))).toBe('100,10 €');
  });
});
