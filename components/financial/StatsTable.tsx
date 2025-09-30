// Stats Table Component
// Displays financial statistics table

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrencyValue, parseMonthKey, buildMonthKey, parsePlanMonthLabel } from '../../utils/financialPlanUtils';
import { calculateUtileFromMacroTotals, getIncassatoTotal } from '../../utils/financialCalculations';
import type { FinancialStatsRow } from '../../data/financialPlanData';
import type { StatsOverrides } from '../../types';

interface StatsTableProps {
  availableYears: number[];
  statsOverrides: StatsOverrides;
  financialStatsRows: FinancialStatsRow[];
  editMode: boolean;
  getPlanPreventivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  getPlanConsuntivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  onStatsOverride: (monthKey: string, field: string, value: number | null) => void;
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
  const statsTableData = useMemo(() => {
    const getFieldValue = (data: any, field: string) => {
      if (!data) return null;
      const overrideKey = `${data.monthKey || ''}|${field}`;
      return statsOverrides[overrideKey] ?? data[field];
    };
    const rows: Array<{
      monthKey: string;
      year: number;
      monthIndex: number;
      corrispettivi: number | null;
      fatturatoImponibile: number | null;
      fatturatoTotale: number | null;
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
    }> = [];

    const statsMap = new Map<
      string,
      FinancialStatsRow & { year: number; monthIndex: number }
    >();

    financialStatsRows.forEach((row) => {
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
        month: base?.month ?? format(new Date(year, monthIndex, 1), 'MMMM yyyy', { locale: it }),
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
          (override as any).fatturatoPrevisionale ?? (base as any)?.fatturatoPrevisionale ?? null,
        incassatoPrevisionale:
          (override as any).incassatoPrevisionale ?? (base as any)?.incassatoPrevisionale ?? null,
        utilePrevisionale:
          (override as any).utilePrevisionale ?? (base as any)?.utilePrevisionale ?? null,
        year,
        monthIndex,
      } as FinancialStatsRow & { year: number; monthIndex: number });
    });

    availableYears.forEach((year) => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthKey = buildMonthKey(year, monthIndex);
        const data = statsMap.get(monthKey);
        
        // Import INCASSATO from monthly plan (following golden rule #1)
        const incassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
        const incassatoPrevisionale = getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, year, monthIndex);
        
        // Import UTILE from monthly plan (calculated using macro totals in correct order)
        const utile = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, year, monthIndex);
        const utilePrevisionale = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanPreventivoValue, year, monthIndex);
        
        // Get field values with overrides
        const dataWithKey = { ...data, monthKey };
        const corrispettivi = getFieldValue(dataWithKey, 'corrispettivi') ?? null;
        const fatturatoImponibile = getFieldValue(dataWithKey, 'fatturatoImponibile') ?? null;
        const saldoConto = getFieldValue(dataWithKey, 'saldoConto') ?? null;
        const saldoSecondoConto = getFieldValue(dataWithKey, 'saldoSecondoConto') ?? null;
        
        // Calculate derived fields
        const fatturatoTotale = (fatturatoImponibile ?? 0) + (corrispettivi ?? 0);
        const saldoTotale = (saldoConto ?? 0) + (saldoSecondoConto ?? 0);
        
        rows.push({
          monthKey,
          year,
          monthIndex,
          corrispettivi,
          fatturatoImponibile,
          fatturatoTotale,
          incassato,
          incassatoPrevisionale,
          saldoConto,
          saldoSecondoConto,
          saldoTotale,
          creditiPendenti: getFieldValue(dataWithKey, 'creditiPendenti') ?? null,
          creditiScaduti: getFieldValue(dataWithKey, 'creditiScaduti') ?? null,
          debitiFornitore: getFieldValue(dataWithKey, 'debitiFornitore') ?? null,
          debitiBancari: getFieldValue(dataWithKey, 'debitiBancari') ?? null,
          utile,
          utilePrevisionale,
        });
      }
    });

    return rows;
  }, [availableYears, statsOverrides, financialStatsRows, getPlanPreventivoValue, getPlanConsuntivoValue, causaliCatalog, planYear]);

  const getRowFieldValue = (row: any, field: string) => {
    const overrideKey = `${row.monthKey}|${field}`;
    return statsOverrides[overrideKey] ?? row[field];
  };

  const handleFieldChange = (monthKey: string, field: string, value: string) => {
    const numValue = value === '' ? null : Number(value);
    onStatsOverride(monthKey, field, numValue);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-y-auto rounded-2xl bg-white p-5 shadow-sm max-h-[80vh]">
        <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
              <th className="px-3 py-3 text-left bg-slate-50 sticky top-0 left-0 z-30 w-48">PERIODO</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">CORRISPETTIVI</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">FATTURATO IMPONIBILE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">FATTURATO TOTALE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">FATTURATO PREVISIONALE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">INCASSATO</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">INCASSATO PREVISIONALE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">SALDO CONTO</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">SECONDO CONTO</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">SALDO TOTALE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">CREDITI PENDENTI</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">CREDITI SCADUTI</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">DEBITI FORNITORI</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">DEBITI BANCARI</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">UTILE</th>
              <th className="px-3 py-3 text-right bg-slate-50 sticky top-0 z-20">UTILE PREVISIONALE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statsTableData.map((row) => (
                <tr key={row.monthKey} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-sm text-gray-600 sticky left-0 bg-white z-10 w-48 hover:bg-slate-50">
                    {format(new Date(row.year, row.monthIndex, 1), 'MMMM yyyy', { locale: it })}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'corrispettivi') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'corrispettivi', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'corrispettivi'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                        value={getRowFieldValue(row, 'fatturatoImponibile') ?? ''}
                        onChange={(e) => handleFieldChange(row.monthKey, 'fatturatoImponibile', e.target.value)}
                      />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'fatturatoImponibile'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700 bg-gray-50">
                    {formatCurrencyValue(row.fatturatoTotale)}
                  </td>
                <td className="px-3 py-2 text-right text-sm text-sky-700 bg-gray-50">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'fatturatoPrevisionale') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'fatturatoPrevisionale', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'fatturatoPrevisionale'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700 bg-gray-50">
                    {formatCurrencyValue(row.incassato)}
                  </td>
                <td className="px-3 py-2 text-right text-sm text-sky-700 bg-gray-50">
                    {formatCurrencyValue(row.incassatoPrevisionale)}
                  </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'saldoConto') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'saldoConto', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'saldoConto'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'saldoSecondoConto') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'saldoSecondoConto', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'saldoSecondoConto'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700 bg-gray-50">
                  {formatCurrencyValue(row.saldoTotale)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'creditiPendenti') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'creditiPendenti', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'creditiPendenti'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'creditiScaduti') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'creditiScaduti', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'creditiScaduti'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'debitiFornitore') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'debitiFornitore', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'debitiFornitore'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-700">
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                      value={getRowFieldValue(row, 'debitiBancari') ?? ''}
                      onChange={(e) => handleFieldChange(row.monthKey, 'debitiBancari', e.target.value)}
                    />
                  ) : (
                    formatCurrencyValue(getRowFieldValue(row, 'debitiBancari'))
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-emerald-700 bg-gray-50">
                    {formatCurrencyValue(row.utile)}
                  </td>
                <td className="px-3 py-2 text-right text-sm text-emerald-700 bg-gray-50">
                    {formatCurrencyValue(row.utilePrevisionale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};
