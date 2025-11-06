const EURO_FORMATTER = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (
  value: number | null | undefined,
  { fallback = EURO_FORMATTER.format(0) }: { fallback?: string } = {}
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return EURO_FORMATTER.format(value);
};
