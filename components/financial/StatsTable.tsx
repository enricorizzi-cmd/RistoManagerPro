// Stats Table Component
// Displays financial statistics table

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  formatCurrencyValue,
  parseMonthKey,
  buildMonthKey,
  parsePlanMonthLabel,
} from '../../utils/financialPlanUtils';
import {
  calculateUtileFromMacroTotals,
  getIncassatoTotal,
} from '../../utils/financialCalculations';
import type { FinancialStatsRow } from '../../data/financialPlanData';
import type { StatsOverrides } from '../../types';

interface StatsTableProps {
  availableYears: number[];
  statsOverrides: StatsOverrides;
  financialStatsRows: FinancialStatsRow[];
  editMode: boolean;
  getPlanPreventivoValue: (
    _macro: string,
    _category: string,
    _detail: string,
    _year: number,
    _monthIndex: number
  ) => number;
  getPlanConsuntivoValue: (
    _macro: string,
    _category: string,
    _detail: string,
    _year: number,
    _monthIndex: number
  ) => number;
  onStatsOverride: (
    _monthKey: string,
    _field: string,
    _value: number | null
  ) => void;
  causaliCatalog: any[];
  planYear: any;
}

export const StatsTable: React.FC<StatsTableProps> = ({
  availableYears,
  statsOverrides,
  financialStatsRows,
  editMode,
  getPlanPreventivoValue,
  getPlanConsuntivoValue,
  onStatsOverride,
  causaliCatalog,
  planYear,
}) => {
  const {
    rows: statsTableData,
    subtotalsByYear,
    periodTotal,
  } = useMemo(() => {
    const getFieldValue = (data: any, field: string) => {
      if (!data) return null;
      const overrideKey = `${data.monthKey || ''}|${field}`;
      return statsOverrides[overrideKey] ?? data[field];
    };

    type StatsRow = {
      monthKey: string;
      year: number;
      monthIndex?: number;
      corrispettivi: number | null;
      fatturatoImponibile: number | null;
      fatturatoTotale: number | null;
      fatturatoPrevisionale?: number | null;
      incassato: number | null;
      incassatoPrevisionale: number | null;
      saldoConto: number | null;
      saldoSecondoConto: number | null;
      saldoTotale: number | null;
      creditiPendenti: number | null;
      creditiScaduti: number | null;
      debitiFornitore: number | null;
      debitiBancari: number | null;
      utile: number | null;
      utilePrevisionale: number | null;
      isSubtotal?: boolean;
      isPeriodTotal?: boolean;
    };

    const rows: StatsRow[] = [];

    const statsMap = new Map<
      string,
      FinancialStatsRow & { year: number; monthIndex: number }
    >();

    financialStatsRows.forEach(row => {
      const parsed = parsePlanMonthLabel(row.month);
      if (!parsed) {
        return;
      }
      const { year, monthIndex } = parsed;
      const monthKey = buildMonthKey(year, monthIndex);
      statsMap.set(monthKey, {
        ...row,
        year,
        monthIndex,
      });
    });

    Object.entries(statsOverrides).forEach(([monthKey, override]) => {
      const parsed = parseMonthKey(monthKey);
      if (!parsed) {
        return;
      }
      const { year, monthIndex } = parsed;
      const base = statsMap.get(monthKey);
      statsMap.set(monthKey, {
        month:
          base?.month ??
          format(new Date(year, monthIndex, 1), 'MMMM yyyy', { locale: it }),
        fatturatoImponibile: base?.fatturatoImponibile ?? null,
        fatturatoTotale: base?.fatturatoTotale ?? null,
        utileCassa: base?.utileCassa ?? null,
        incassato: base?.incassato ?? null,
        saldoConto: base?.saldoConto ?? null,
        saldoSecondoConto: base?.saldoSecondoConto ?? null,
        saldoTotale: base?.saldoTotale ?? null,
        creditiPendenti: base?.creditiPendenti ?? null,
        creditiScaduti: base?.creditiScaduti ?? null,
        debitiFornitore: base?.debitiFornitore ?? null,
        debitiBancari: base?.debitiBancari ?? null,
        fatturatoPrevisionale:
          (override as any).fatturatoPrevisionale ??
          (base as any)?.fatturatoPrevisionale ??
          null,
        incassatoPrevisionale:
          (override as any).incassatoPrevisionale ??
          (base as any)?.incassatoPrevisionale ??
          null,
        utilePrevisionale:
          (override as any).utilePrevisionale ??
          (base as any)?.utilePrevisionale ??
          null,
        year,
        monthIndex,
      } as FinancialStatsRow & { year: number; monthIndex: number });
    });

    availableYears.forEach(year => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthKey = buildMonthKey(year, monthIndex);
        const data = statsMap.get(monthKey);

        // Import INCASSATO from monthly plan (following golden rule #1)
        const incassato = getIncassatoTotal(
          causaliCatalog,
          planYear,
          getPlanConsuntivoValue,
          year,
          monthIndex
        );
        const incassatoPrevisionale = getIncassatoTotal(
          causaliCatalog,
          planYear,
          getPlanPreventivoValue,
          year,
          monthIndex
        );

        // Import UTILE from monthly plan (calculated using macro totals in correct order)
        const utile = calculateUtileFromMacroTotals(
          causaliCatalog,
          planYear,
          getPlanConsuntivoValue,
          year,
          monthIndex
        );
        const utilePrevisionale = calculateUtileFromMacroTotals(
          causaliCatalog,
          planYear,
          getPlanPreventivoValue,
          year,
          monthIndex
        );

        // Get field values with overrides
        const dataWithKey = { ...data, monthKey };
        const corrispettivi =
          getFieldValue(dataWithKey, 'corrispettivi') ?? null;
        const fatturatoImponibile =
          getFieldValue(dataWithKey, 'fatturatoImponibile') ?? null;
        const fatturatoPrevisionale =
          getFieldValue(dataWithKey, 'fatturatoPrevisionale') ?? null;
        const saldoConto = getFieldValue(dataWithKey, 'saldoConto') ?? null;
        const saldoSecondoConto =
          getFieldValue(dataWithKey, 'saldoSecondoConto') ?? null;

        // Calculate derived fields
        const fatturatoTotale =
          (fatturatoImponibile ?? 0) + (corrispettivi ?? 0);
        const saldoTotale = (saldoConto ?? 0) + (saldoSecondoConto ?? 0);

        rows.push({
          monthKey,
          year,
          monthIndex,
          corrispettivi,
          fatturatoImponibile,
          fatturatoTotale,
          fatturatoPrevisionale,
          incassato,
          incassatoPrevisionale,
          saldoConto,
          saldoSecondoConto,
          saldoTotale,
          creditiPendenti:
            getFieldValue(dataWithKey, 'creditiPendenti') ?? null,
          creditiScaduti: getFieldValue(dataWithKey, 'creditiScaduti') ?? null,
          debitiFornitore:
            getFieldValue(dataWithKey, 'debitiFornitore') ?? null,
          debitiBancari: getFieldValue(dataWithKey, 'debitiBancari') ?? null,
          utile,
          utilePrevisionale,
        });
      }
    });

    // Calculate subtotals by year and total for period
    const subtotalsByYear = new Map<number, StatsRow>();
    let periodTotal: StatsRow | null = null;

    // Initialize subtotals
    availableYears.forEach(year => {
      subtotalsByYear.set(year, {
        year,
        monthKey: `subtotal_${year}`,
        isSubtotal: true,
        corrispettivi: 0,
        fatturatoImponibile: 0,
        fatturatoTotale: 0,
        fatturatoPrevisionale: 0,
        incassato: 0,
        incassatoPrevisionale: 0,
        saldoConto: 0,
        saldoSecondoConto: 0,
        saldoTotale: 0,
        creditiPendenti: 0,
        creditiScaduti: 0,
        debitiFornitore: 0,
        debitiBancari: 0,
        utile: 0,
        utilePrevisionale: 0,
      });
    });

    // Initialize period total (only if multiple years)
    if (availableYears.length > 1) {
      periodTotal = {
        year: 0,
        monthKey: 'period_total',
        isPeriodTotal: true,
        corrispettivi: 0,
        fatturatoImponibile: 0,
        fatturatoTotale: 0,
        fatturatoPrevisionale: 0,
        incassato: 0,
        incassatoPrevisionale: 0,
        saldoConto: 0,
        saldoSecondoConto: 0,
        saldoTotale: 0,
        creditiPendenti: 0,
        creditiScaduti: 0,
        debitiFornitore: 0,
        debitiBancari: 0,
        utile: 0,
        utilePrevisionale: 0,
      };
    }

    // Sum up values
    rows.forEach(row => {
      const yearSubtotal = subtotalsByYear.get(row.year);
      if (yearSubtotal) {
        yearSubtotal.corrispettivi += row.corrispettivi ?? 0;
        yearSubtotal.fatturatoImponibile += row.fatturatoImponibile ?? 0;
        yearSubtotal.fatturatoTotale += row.fatturatoTotale ?? 0;
        yearSubtotal.fatturatoPrevisionale += row.fatturatoPrevisionale ?? 0;
        yearSubtotal.incassato += row.incassato ?? 0;
        yearSubtotal.incassatoPrevisionale += row.incassatoPrevisionale ?? 0;
        yearSubtotal.saldoConto += row.saldoConto ?? 0;
        yearSubtotal.saldoSecondoConto += row.saldoSecondoConto ?? 0;
        yearSubtotal.saldoTotale += row.saldoTotale ?? 0;
        yearSubtotal.creditiPendenti += row.creditiPendenti ?? 0;
        yearSubtotal.creditiScaduti += row.creditiScaduti ?? 0;
        yearSubtotal.debitiFornitore += row.debitiFornitore ?? 0;
        yearSubtotal.debitiBancari += row.debitiBancari ?? 0;
        yearSubtotal.utile += row.utile ?? 0;
        yearSubtotal.utilePrevisionale += row.utilePrevisionale ?? 0;
      }

      if (periodTotal) {
        periodTotal.corrispettivi += row.corrispettivi ?? 0;
        periodTotal.fatturatoImponibile += row.fatturatoImponibile ?? 0;
        periodTotal.fatturatoTotale += row.fatturatoTotale ?? 0;
        periodTotal.fatturatoPrevisionale += row.fatturatoPrevisionale ?? 0;
        periodTotal.incassato += row.incassato ?? 0;
        periodTotal.incassatoPrevisionale += row.incassatoPrevisionale ?? 0;
        periodTotal.saldoConto += row.saldoConto ?? 0;
        periodTotal.saldoSecondoConto += row.saldoSecondoConto ?? 0;
        periodTotal.saldoTotale += row.saldoTotale ?? 0;
        periodTotal.creditiPendenti += row.creditiPendenti ?? 0;
        periodTotal.creditiScaduti += row.creditiScaduti ?? 0;
        periodTotal.debitiFornitore += row.debitiFornitore ?? 0;
        periodTotal.debitiBancari += row.debitiBancari ?? 0;
        periodTotal.utile += row.utile ?? 0;
        periodTotal.utilePrevisionale += row.utilePrevisionale ?? 0;
      }
    });

    return { rows, subtotalsByYear, periodTotal };
  }, [
    availableYears,
    statsOverrides,
    financialStatsRows,
    getPlanPreventivoValue,
    getPlanConsuntivoValue,
    causaliCatalog,
    planYear,
  ]);

  const getRowFieldValue = (row: any, field: string) => {
    const overrideKey = `${row.monthKey}|${field}`;
    return statsOverrides[overrideKey] ?? row[field];
  };

  const handleFieldChange = (
    monthKey: string,
    field: string,
    value: string
  ) => {
    const numValue = value === '' ? null : Number(value);
    onStatsOverride(monthKey, field, numValue);

    // Auto-save fatturatoTotale when fatturatoImponibile or corrispettivi change
    if (field === 'fatturatoImponibile' || field === 'corrispettivi') {
      const currentCorrispettivi =
        field === 'corrispettivi'
          ? numValue
          : (statsOverrides[`${monthKey}|corrispettivi`] ?? null);
      const currentFatturatoImponibile =
        field === 'fatturatoImponibile'
          ? numValue
          : (statsOverrides[`${monthKey}|fatturatoImponibile`] ?? null);

      const fatturatoTotale =
        (currentFatturatoImponibile ?? 0) + (currentCorrispettivi ?? 0);
      onStatsOverride(monthKey, 'fatturatoTotale', fatturatoTotale);
    }
  };

  const getValueStyle = (value: number | null, baseStyle: string) => {
    if (value === null || value === undefined) return baseStyle;
    if (value < 0) return `${baseStyle} text-red-600 font-bold`;
    return baseStyle;
  };

  const renderSubtotalRow = (subtotal: any, isPeriodTotal: boolean = false) => (
    <tr
      key={subtotal.monthKey}
      className="bg-gradient-to-r from-slate-100 to-slate-200 border-t-2 border-gray-400"
    >
      <td className="px-4 py-3 text-sm font-bold text-gray-900 sticky left-0 bg-gradient-to-r from-slate-100 to-slate-200 z-10 w-48 border-r border-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
          {isPeriodTotal ? 'TOTALE PERIODO' : `SUBTOTALE ${subtotal.year}`}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.corrispettivi, 'font-bold')}>
          {formatCurrencyValue(subtotal.corrispettivi)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span
          className={getValueStyle(subtotal.fatturatoImponibile, 'font-bold')}
        >
          {formatCurrencyValue(subtotal.fatturatoImponibile)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200">
        <span
          className={getValueStyle(
            subtotal.fatturatoTotale,
            'font-bold text-blue-900'
          )}
        >
          {formatCurrencyValue(subtotal.fatturatoTotale)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span
          className={getValueStyle(subtotal.fatturatoPrevisionale, 'font-bold')}
        >
          {formatCurrencyValue(subtotal.fatturatoPrevisionale)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200">
        <span
          className={getValueStyle(
            subtotal.incassato,
            'font-bold text-blue-900'
          )}
        >
          {formatCurrencyValue(subtotal.incassato)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-emerald-100 to-emerald-200">
        <span
          className={getValueStyle(
            subtotal.incassatoPrevisionale,
            'font-bold text-emerald-900'
          )}
        >
          {formatCurrencyValue(subtotal.incassatoPrevisionale)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.saldoConto, 'font-bold')}>
          {formatCurrencyValue(subtotal.saldoConto)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span
          className={getValueStyle(subtotal.saldoSecondoConto, 'font-bold')}
        >
          {formatCurrencyValue(subtotal.saldoSecondoConto)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200">
        <span
          className={getValueStyle(
            subtotal.saldoTotale,
            'font-bold text-blue-900'
          )}
        >
          {formatCurrencyValue(subtotal.saldoTotale)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.creditiPendenti, 'font-bold')}>
          {formatCurrencyValue(subtotal.creditiPendenti)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.creditiScaduti, 'font-bold')}>
          {formatCurrencyValue(subtotal.creditiScaduti)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.debitiFornitore, 'font-bold')}>
          {formatCurrencyValue(subtotal.debitiFornitore)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
        <span className={getValueStyle(subtotal.debitiBancari, 'font-bold')}>
          {formatCurrencyValue(subtotal.debitiBancari)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-emerald-100 to-emerald-200">
        <span
          className={getValueStyle(
            subtotal.utile,
            'font-bold text-emerald-900'
          )}
        >
          {formatCurrencyValue(subtotal.utile)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold bg-gradient-to-r from-emerald-200 to-emerald-300">
        <span
          className={getValueStyle(
            subtotal.utilePrevisionale,
            'font-bold text-emerald-900'
          )}
        >
          {formatCurrencyValue(subtotal.utilePrevisionale)}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Statistiche Finanziarie
            </h2>
            <p className="text-gray-600">
              Dettaglio mensile delle performance finanziarie
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-200"></div>
            <span className="text-sm font-medium text-blue-700">
              {statsTableData.length} mesi
              {availableYears.length > 1 &&
                ` + ${availableYears.length} subtotali + 1 totale`}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[80vh]">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs uppercase tracking-wide text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 left-0 z-30 w-48 border-r border-gray-300 font-semibold">
                  PERIODO
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-20 font-semibold">
                  RICEVUTE FISCALI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-20 font-semibold">
                  FATTURE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0 z-20 font-semibold text-blue-800">
                  FATTURATO TOTALE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-emerald-50 to-emerald-100 sticky top-0 z-20 font-semibold text-emerald-800">
                  FATTURATO PREVISIONALE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0 z-20 font-semibold text-blue-800">
                  VERSAMENTI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-emerald-50 to-emerald-100 sticky top-0 z-20 font-semibold text-emerald-800">
                  VERSAMENTI PREVISIONALE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-20 font-semibold">
                  SALDO CONTO
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-20 font-semibold">
                  SECONDO CONTO
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0 z-20 font-semibold text-blue-800">
                  SALDO TOTALE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-orange-50 to-orange-100 sticky top-0 z-20 font-semibold text-orange-800">
                  CREDITI PENDENTI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-red-50 to-red-100 sticky top-0 z-20 font-semibold text-red-800">
                  CREDITI SCADUTI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-purple-50 to-purple-100 sticky top-0 z-20 font-semibold text-purple-800">
                  DEBITI FORNITORI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-purple-50 to-purple-100 sticky top-0 z-20 font-semibold text-purple-800">
                  DEBITI BANCARI
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-emerald-50 to-emerald-100 sticky top-0 z-20 font-semibold text-emerald-800">
                  UTILE
                </th>
                <th className="px-4 py-4 text-right bg-gradient-to-r from-emerald-50 to-emerald-100 sticky top-0 z-20 font-semibold text-emerald-800">
                  UTILE PREVISIONALE
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statsTableData.map((row, index) => {
                const isLastMonthOfYear =
                  index === statsTableData.length - 1 ||
                  statsTableData[index + 1]?.year !== row.year;
                const subtotal = subtotalsByYear.get(row.year);

                return (
                  <React.Fragment key={row.monthKey}>
                    <tr
                      className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white z-10 w-48 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          {format(
                            new Date(row.year, row.monthIndex, 1),
                            'MMMM yyyy',
                            { locale: it }
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            value={getRowFieldValue(row, 'corrispettivi') ?? ''}
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'corrispettivi',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'corrispettivi'),
                              'font-semibold'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'corrispettivi')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'fatturatoImponibile') ?? ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'fatturatoImponibile',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'fatturatoImponibile'),
                              'font-semibold'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'fatturatoImponibile')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-blue-25 to-blue-50">
                        <span
                          className={getValueStyle(
                            row.fatturatoTotale,
                            'font-bold text-blue-800'
                          )}
                        >
                          {formatCurrencyValue(row.fatturatoTotale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-emerald-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-emerald-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'fatturatoPrevisionale') ??
                              ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'fatturatoPrevisionale',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'fatturatoPrevisionale'),
                              'font-semibold text-emerald-700'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'fatturatoPrevisionale')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-blue-25 to-blue-50">
                        <span
                          className={getValueStyle(
                            row.incassato,
                            'font-bold text-blue-800'
                          )}
                        >
                          {formatCurrencyValue(row.incassato)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-emerald-25 to-emerald-50">
                        <span
                          className={getValueStyle(
                            row.incassatoPrevisionale,
                            'font-bold text-emerald-800'
                          )}
                        >
                          {formatCurrencyValue(row.incassatoPrevisionale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            value={getRowFieldValue(row, 'saldoConto') ?? ''}
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'saldoConto',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'saldoConto'),
                              'font-semibold'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'saldoConto')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'saldoSecondoConto') ?? ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'saldoSecondoConto',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'saldoSecondoConto'),
                              'font-semibold'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'saldoSecondoConto')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-blue-25 to-blue-50">
                        <span
                          className={getValueStyle(
                            row.saldoTotale,
                            'font-bold text-blue-800'
                          )}
                        >
                          {formatCurrencyValue(row.saldoTotale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-orange-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-orange-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'creditiPendenti') ?? ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'creditiPendenti',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'creditiPendenti'),
                              'font-semibold text-orange-700'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'creditiPendenti')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-red-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-red-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'creditiScaduti') ?? ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'creditiScaduti',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'creditiScaduti'),
                              'font-semibold text-red-700'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'creditiScaduti')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-purple-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-purple-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                            value={
                              getRowFieldValue(row, 'debitiFornitore') ?? ''
                            }
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'debitiFornitore',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'debitiFornitore'),
                              'font-semibold text-purple-700'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'debitiFornitore')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-purple-800">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-purple-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                            value={getRowFieldValue(row, 'debitiBancari') ?? ''}
                            onChange={e =>
                              handleFieldChange(
                                row.monthKey,
                                'debitiBancari',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span
                            className={getValueStyle(
                              getRowFieldValue(row, 'debitiBancari'),
                              'font-semibold text-purple-700'
                            )}
                          >
                            {formatCurrencyValue(
                              getRowFieldValue(row, 'debitiBancari')
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-emerald-25 to-emerald-50">
                        <span
                          className={getValueStyle(
                            row.utile,
                            'font-bold text-emerald-800'
                          )}
                        >
                          {formatCurrencyValue(row.utile)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm bg-gradient-to-r from-emerald-50 to-emerald-100">
                        <span
                          className={getValueStyle(
                            row.utilePrevisionale,
                            'font-bold text-emerald-900'
                          )}
                        >
                          {formatCurrencyValue(row.utilePrevisionale)}
                        </span>
                      </td>
                    </tr>

                    {/* Subtotal row after last month of year */}
                    {isLastMonthOfYear &&
                      subtotal &&
                      renderSubtotalRow(subtotal, false)}
                  </React.Fragment>
                );
              })}

              {/* Period total row (only if multiple years) */}
              {periodTotal && renderSubtotalRow(periodTotal, true)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
