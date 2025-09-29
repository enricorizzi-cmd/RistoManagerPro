/// <reference types='vite/client' />
import type { FinancialCausaleGroup } from '../data/financialPlanData';

type ManualLogSnapshot = {
  id: string;
  createdAt: string;
  year: number;
  month: number;
  macroCategory: string;
  category: string;
  causale: string;
  value: number;
};

type MonthlyMetricsSnapshot = {
  id: string;
  createdAt: string;
  year: number;
  month: number;
  values: Record<string, number>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export type FinancialPlanStatePayload = {
  preventivoOverrides: Record<string, Record<string, Record<string, Record<string, number>>>>;
  manualLog: ManualLogSnapshot[];
  monthlyMetrics: MonthlyMetricsSnapshot[];
  statsOverrides: Record<string, Partial<Record<string, number | null>>>;
  causaliCatalog: FinancialCausaleGroup[];
  causaliVersion: string | null;
};

const DEFAULT_STATE: FinancialPlanStatePayload = {
  preventivoOverrides: {},
  manualLog: [],
  monthlyMetrics: [],
  statsOverrides: {},
  causaliCatalog: [],
  causaliVersion: null,
};

function buildUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${trimmed}`;
}

export async function fetchFinancialPlanState(): Promise<FinancialPlanStatePayload | null> {
  try {
    const response = await fetch(buildUrl('/api/financial-plan/state'));
    if (!response.ok) {
      console.warn('Unable to fetch financial plan state, status', response.status);
      return null;
    }
    const data = await response.json();
    return normalisePayload(data);
  } catch (error) {
    console.warn('Failed to fetch financial plan state', error);
    return null;
  }
}

export async function persistFinancialPlanState(state: FinancialPlanStatePayload): Promise<void> {
  try {
    await fetch(buildUrl('/api/financial-plan/state'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
  } catch (error) {
    console.warn('Failed to persist financial plan state', error);
  }
}

function normalisePayload(input: unknown): FinancialPlanStatePayload {
  if (!input || typeof input !== 'object') {
    return DEFAULT_STATE;
  }

  const source = input as Record<string, unknown>;

  const preventivoOverrides = isObject(source.preventivoOverrides)
    ? (source.preventivoOverrides as FinancialPlanStatePayload['preventivoOverrides'])
    : DEFAULT_STATE.preventivoOverrides;

  const statsOverrides = isObject(source.statsOverrides)
    ? (source.statsOverrides as FinancialPlanStatePayload['statsOverrides'])
    : DEFAULT_STATE.statsOverrides;

  const manualLog = Array.isArray(source.manualLog)
    ? (source.manualLog as FinancialPlanStatePayload['manualLog'])
    : DEFAULT_STATE.manualLog;

  const monthlyMetrics = Array.isArray(source.monthlyMetrics)
    ? (source.monthlyMetrics as FinancialPlanStatePayload['monthlyMetrics'])
    : DEFAULT_STATE.monthlyMetrics;


  const causaliCatalog = Array.isArray(source.causaliCatalog)
    ? (source.causaliCatalog as FinancialPlanStatePayload['causaliCatalog'])
    : DEFAULT_STATE.causaliCatalog;

  const causaliVersion = typeof source.causaliVersion === 'string' ? source.causaliVersion : null;

  return {
    preventivoOverrides,
    statsOverrides,
    manualLog,
    monthlyMetrics,
    causaliCatalog,
    causaliVersion,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}






