import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../../utils/format';

// Helper to normalize spaces (Intl.NumberFormat uses NBSP)
const normalizeSpaces = (str: string) => str.replace(/\u00A0/g, ' ');

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(normalizeSpaces(formatCurrency(1234.56))).toBe('1234,56 €');
  });

  it('formats zero correctly', () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe('0,00 €');
  });

  it('formats negative numbers correctly', () => {
    expect(normalizeSpaces(formatCurrency(-1234.56))).toBe('-1234,56 €');
  });

  it('handles decimal places correctly', () => {
    expect(normalizeSpaces(formatCurrency(100.1))).toBe('100,10 €');
  });
});
