// Financial Plan Utilities
// Extracted from FinancialPlan component for better maintainability

export const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const;

export const MONTH_SHORT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
] as const;

export const MONTH_MAP: Record<string, number> = {
  GENNAIO: 0,
  FEBBRAIO: 1,
  MARZO: 2,
  APRILE: 3,
  MAGGIO: 4,
  GIUGNO: 5,
  LUGLIO: 6,
  AGOSTO: 7,
  SETTEMBRE: 8,
  OTTOBRE: 9,
  NOVEMBRE: 10,
  DICEMBRE: 11,
  // Abbreviazioni per i dati delle statistiche
  GEN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAG: 4,
  GIU: 5,
  LUG: 6,
  AGO: 7,
  SET: 8,
  OTT: 9,
  NOV: 10,
  DIC: 11,
};

export const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const normalizeLabel = (value: string): string => value.trim().toUpperCase();

export const parsePlanMonthLabel = (
  label: string,
): { year: number; monthIndex: number } | null => {
  if (!label) {
    return null;
  }
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  let year = Number(parts[parts.length - 1]);
  const monthName = normalizeLabel(parts.slice(0, parts.length - 1).join(' '));
  const monthIndex = MONTH_MAP[monthName];
  
  // Handle 2-digit years (e.g., "24" -> 2024)
  if (year < 100) {
    year += 2000;
  }
  
  if (Number.isNaN(year) || monthIndex === undefined) {
    return null;
  }
  return { year, monthIndex };
};

export const buildMonthKey = (year: number, monthIndex: number): string => 
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

export const parseMonthKey = (
  key: string,
): { year: number; monthIndex: number } | null => {
  const [yearPart, monthPart] = key.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return null;
  }
  return { year, monthIndex };
};

export const formatCurrencyValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Math.abs(value) < 0.005) {
    return '-';
  }
  return currencyFormatter.format(value);
};

export const parseNumberInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/,/g, '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const calcRatios = (values: number[]): number[] => {
  const total = values.reduce((acc, value) => acc + value, 0);
  if (values.length === 0) {
    return [];
  }
  if (total === 0) {
    return values.map(() => 1 / values.length);
  }
  return values.map((value) => value / total);
};
