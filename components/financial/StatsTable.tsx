// Stats Table Component
// Displays financial statistics table

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrencyValue, parseMonthKey, buildMonthKey, parsePlanMonthLabel } from '../../utils/financialPlanUtils';
import type { FinancialStatsRow } from '../../data/financialPlanData';
import type { StatsOverrides } from '../../types';

interface StatsTableProps {
  availableYears: number[];
  statsOverrides: StatsOverrides;
  financialStatsRows: FinancialStatsRow[];
}

export const StatsTable: React.FC<StatsTableProps> = ({
  availableYears,
  statsOverrides,
  financialStatsRows,
}) => {
  const statsTableData = useMemo(() => {
    const rows: Array<{
      monthKey: string;
      year: number;
      monthIndex: number;
      fatturatoTotale: number | null;
      fatturatoPrevisionale: number | null;
      incassato: number | null;
      incassatoPrevisionale: number | null;
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
        rows.push({
          monthKey,
          year,
          monthIndex,
          fatturatoTotale: data?.fatturatoTotale ?? null,
          fatturatoPrevisionale: data?.fatturatoPrevisionale ?? null,
          incassato: data?.incassato ?? null,
          incassatoPrevisionale: data?.incassatoPrevisionale ?? null,
          utile: data?.utileCassa ?? null,
          utilePrevisionale: data?.utilePrevisionale ?? null,
        });
      }
    });

    return rows;
  }, [availableYears, statsOverrides, financialStatsRows]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-3 text-left">Periodo</th>
                <th className="px-3 py-3 text-right">Fatturato</th>
                <th className="px-3 py-3 text-right">Fatturato previsionale</th>
                <th className="px-3 py-3 text-right">Incassato</th>
                <th className="px-3 py-3 text-right">Incassato previsionale</th>
                <th className="px-3 py-3 text-right">Utile</th>
                <th className="px-3 py-3 text-right">Utile previsionale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statsTableData.map((row) => (
                <tr key={row.monthKey} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {format(new Date(row.year, row.monthIndex, 1), 'MMMM yyyy', { locale: it })}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                    {formatCurrencyValue(row.fatturatoTotale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">
                    {formatCurrencyValue(row.fatturatoPrevisionale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                    {formatCurrencyValue(row.incassato)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">
                    {formatCurrencyValue(row.incassatoPrevisionale)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">
                    {formatCurrencyValue(row.utile)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">
                    {formatCurrencyValue(row.utilePrevisionale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
