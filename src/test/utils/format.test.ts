import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../../utils/format';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('1234,56 €');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('0,00 €');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-1234,56 €');
  });

  it('handles decimal places correctly', () => {
    expect(formatCurrency(100.1)).toBe('100,10 €');
  });
});
