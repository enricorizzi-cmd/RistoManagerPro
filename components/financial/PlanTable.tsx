// Plan Table Component
// Displays the main financial plan table with editing capabilities

import React, { useCallback } from 'react';
import { formatCurrencyValue, MONTH_NAMES, buildMonthKey } from '../../utils/financialPlanUtils';
import { calculateUtileFromMacroTotals, getIncassatoTotal } from '../../utils/financialCalculations';
import type { FinancialCausaleGroup } from '../../data/financialPlanData';
import type { PlanYearData } from '../../utils/financialCalculations';

interface PlanTableProps {
  planYear: PlanYearData | undefined;
  selectedYear: number;
  causaliCatalog: FinancialCausaleGroup[];
  editMode: boolean;
  onlyValued: boolean;
  onlyConsuntivo: boolean;
  dirtyKeys: Set<string>;
  loadingState: boolean;
  getPlanPreventivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  getPlanConsuntivoValue: (macro: string, category: string, detail: string, year: number, monthIndex: number) => number;
  setOverride: (target: 'preventivo' | 'consuntivo', macro: string, category: string, detail: string, year: number, monthIndex: number, value: number | null) => void;
}

export const PlanTable: React.FC<PlanTableProps> = ({
  planYear,
  selectedYear,
  causaliCatalog,
  editMode,
  onlyValued,
  onlyConsuntivo,
  dirtyKeys,
  loadingState,
  getPlanPreventivoValue,
  getPlanConsuntivoValue,
  setOverride,
}) => {
  const rowHasAnyValue = useCallback((
    macro: string,
    category: string,
    detail: string,
    year: number,
  ): boolean => {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const p = getPlanPreventivoValue(macro, category, detail, year, monthIndex);
      const c = getPlanConsuntivoValue(macro, category, detail, year, monthIndex);
      if ((p ?? 0) !== 0 || (c ?? 0) !== 0) return true;
    }
    return false;
  }, [getPlanPreventivoValue, getPlanConsuntivoValue]);

  const getMacroColor = (macro: string) => {
    switch (macro) {
      case 'INCASSATO':
        return 'bg-blue-50 text-blue-800';
      case 'COSTI FISSI':
        return 'bg-orange-50 text-orange-800';
      case 'COSTI VARIABILI':
        return 'bg-yellow-50 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loadingState) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Caricamento…</p>
      </div>
    );
  }

  if (!planYear) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Nessun dato disponibile per la selezione corrente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto rounded-2xl bg-white p-5 shadow-sm max-h-[80vh]">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-3 text-left bg-slate-50 sticky top-0 left-0 z-30 w-48">CATEGORIA</th>
            <th className="px-3 py-3 text-center border-l-2 border-gray-300 bg-slate-50 sticky top-0 z-20">SOMMA PROGRESSIVA</th>
            <th className="px-3 py-3 text-center bg-slate-50 sticky top-0 z-20">INCIDENZA PROGRESSIVA</th>
            {MONTH_NAMES.map((name) => (
              <th key={name} className="px-3 py-3 text-center border-l-2 border-gray-300 bg-slate-50 sticky top-0 z-20" colSpan={onlyConsuntivo ? 1 : 2}>
                {name}
              </th>
            ))}
          </tr>
          <tr>
            <th className="px-3 py-2 bg-slate-50 sticky top-[3rem] left-0 z-30 w-48"></th>
            <th className="px-3 py-2 text-center text-xs font-normal border-l-2 border-gray-300 bg-slate-50 sticky top-[3rem] z-20">TOTALE</th>
            <th className="px-3 py-2 text-center text-xs font-normal bg-slate-50 sticky top-[3rem] z-20">%</th>
            {MONTH_NAMES.map((name) => (
              <React.Fragment key={name}>
                {!onlyConsuntivo && (
                  <th className="px-3 py-2 text-center text-xs font-normal border-l-2 border-gray-300 bg-slate-50 sticky top-[3rem] z-20">PREVENTIVO</th>
                )}
                <th className="px-3 py-2 text-center text-xs font-normal bg-slate-50 sticky top-[3rem] z-20">CONSUNTIVO</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {causaliCatalog.map((group) => (
            <React.Fragment key={group.macroCategory}>
              <tr className={`${getMacroColor(group.macroCategory)} text-sm font-bold uppercase`}>
                <td className="px-3 py-3 sticky left-0 bg-inherit z-10 w-48">{group.macroCategory}</td>
                {(() => {
                  const macroSum = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + MONTH_NAMES.reduce((monthAcc, _, monthIndex) => 
                        monthAcc + getPlanConsuntivoValue(group.macroCategory, cat.name, d.detail, selectedYear, monthIndex), 0
                      ), 0
                    );
                  }, 0);
                  
                  // For INCASSATO, the percentage should always be 100%
                  // For other categories, calculate percentage based on monthly incassato values
                  let percentage = 0;
                  if (group.macroId === 1) { // INCASSATO
                    percentage = 100;
                  } else {
                    // Calculate progressive incidence: sum of (monthly_value / monthly_incassato) for each month
                    let totalPercentage = 0;
                    MONTH_NAMES.forEach((_, monthIndex) => {
                      const monthlyIncassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
                      const monthlyMacroValue = group.categories.reduce((acc, cat) => {
                        const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                        const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                        return acc + categoryDetails.reduce((catAcc, d) => 
                          catAcc + getPlanConsuntivoValue(group.macroCategory, cat.name, d.detail, selectedYear, monthIndex), 0
                        );
                      }, 0);
                      if (monthlyIncassato > 0) {
                        totalPercentage += (monthlyMacroValue / monthlyIncassato) * 100;
                      }
                    });
                    percentage = totalPercentage;
                  }
                  
                  return (
                    <>
                      <td className="px-3 py-3 text-right border-l-2 border-gray-300">
                        {formatCurrencyValue(macroSum)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {percentage.toFixed(1)}%
                      </td>
                    </>
                  );
                })()}
                {MONTH_NAMES.map((_, monthIndex) => {
                  const p = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + getPlanPreventivoValue(group.macroCategory, cat.name, d.detail, selectedYear, monthIndex), 0
                    );
                  }, 0);
                  const c = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + getPlanConsuntivoValue(group.macroCategory, cat.name, d.detail, selectedYear, monthIndex), 0
                    );
                  }, 0);
                  
                  return (
                    <React.Fragment key={`macro-header-${monthIndex}`}>
                      {!onlyConsuntivo && (
                        <td className="px-3 py-3 text-right border-l-2 border-gray-300">
                          {formatCurrencyValue(p)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        {formatCurrencyValue(c)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
              {group.categories.map((category) => {
                const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                const categoryDetails = macro?.details?.filter(d => d.category === category.name) ?? [];
                const hasAny = categoryDetails.some((detail) =>
                  rowHasAnyValue(group.macroCategory, category.name, detail.detail, selectedYear),
                );
                if (onlyValued && !hasAny) return null;
                
                return (
                  <React.Fragment key={`${group.macroCategory}-${category.name}`}>
                    {/* Subtotale categoria */}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-3 py-2 text-sm text-gray-700 sticky left-0 bg-slate-50 z-10 w-48">{category.name}</td>
                      {(() => {
                        const categorySum = categoryDetails.reduce((acc, d) => 
                          acc + MONTH_NAMES.reduce((monthAcc, _, monthIndex) => 
                            monthAcc + getPlanConsuntivoValue(group.macroCategory, category.name, d.detail, selectedYear, monthIndex), 0
                          ), 0
                        );
                        
                        // Calculate progressive incidence: sum of (monthly_value / monthly_incassato) for each month
                        let totalPercentage = 0;
                        MONTH_NAMES.forEach((_, monthIndex) => {
                          const monthlyIncassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
                          const monthlyCategoryValue = categoryDetails.reduce((acc, d) => 
                            acc + getPlanConsuntivoValue(group.macroCategory, category.name, d.detail, selectedYear, monthIndex), 0
                          );
                          if (monthlyIncassato > 0) {
                            totalPercentage += (monthlyCategoryValue / monthlyIncassato) * 100;
                          }
                        });
                        
                        return (
                          <>
                            <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                              <div className="font-semibold text-gray-800">{formatCurrencyValue(categorySum)}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              <div className="font-semibold text-gray-800">{totalPercentage.toFixed(1)}%</div>
                            </td>
                          </>
                        );
                      })()}
                      {MONTH_NAMES.map((_, monthIndex) => {
                        const p = categoryDetails.reduce((acc, d) => acc + getPlanPreventivoValue(group.macroCategory, category.name, d.detail, selectedYear, monthIndex), 0);
                        const c = categoryDetails.reduce((acc, d) => acc + getPlanConsuntivoValue(group.macroCategory, category.name, d.detail, selectedYear, monthIndex), 0);
                        return (
                          <React.Fragment key={`subtotal-${monthIndex}`}>
                            {!onlyConsuntivo && (
                              <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                                <div className="font-semibold text-sky-700">{formatCurrencyValue(p)}</div>
                              </td>
                            )}
                            <td className="px-3 py-2 text-right text-sm">
                              <div className="font-semibold text-gray-800">{formatCurrencyValue(c)}</div>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    {/* Righe causali */}
                    {category.items.map((causale) => {
                      const detail = categoryDetails.find(d => d.detail === causale);
                      if (!detail) return null;
                      
                      // Check if this specific causal row has any values
                      const hasCausaleValue = rowHasAnyValue(group.macroCategory, category.name, causale, selectedYear);
                      if (onlyValued && !hasCausaleValue) return null;
                      
                      return (
                        <tr key={`${category.name}-${causale}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm text-gray-700 pl-6 sticky left-0 bg-white z-10 w-48 hover:bg-slate-50">{causale}</td>
                          {(() => {
                            const causaleSum = MONTH_NAMES.reduce((acc, _, monthIndex) => 
                              acc + getPlanConsuntivoValue(group.macroCategory, category.name, causale, selectedYear, monthIndex), 0
                            );
                            
                            // Calculate progressive incidence: sum of (monthly_value / monthly_incassato) for each month
                            let totalPercentage = 0;
                            MONTH_NAMES.forEach((_, monthIndex) => {
                              const monthlyIncassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
                              const monthlyCausaleValue = getPlanConsuntivoValue(group.macroCategory, category.name, causale, selectedYear, monthIndex);
                              if (monthlyIncassato > 0) {
                                totalPercentage += (monthlyCausaleValue / monthlyIncassato) * 100;
                              }
                            });
                            
                            return (
                              <>
                                <td className="px-3 py-2 text-right text-sm text-gray-700 border-l-2 border-gray-200">
                                  <div className="text-gray-800">{formatCurrencyValue(causaleSum)}</div>
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-gray-700">
                                  <div className="text-gray-800">{totalPercentage.toFixed(1)}%</div>
                                </td>
                              </>
                            );
                          })()}
                          {detail.months.map((month) => (
                            <React.Fragment key={month.monthIndex}>
                              {!onlyConsuntivo && (
                                <td className="px-3 py-2 text-right text-sm text-gray-700 border-l-2 border-gray-200">
                                  {!editMode ? (
                                    <div className="text-sky-700">{formatCurrencyValue(getPlanPreventivoValue(group.macroCategory, category.name, causale, selectedYear, month.monthIndex))}</div>
                                  ) : (
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      className={`w-28 rounded border px-2 py-1 text-right text-sm ${dirtyKeys.has(`preventivo|${group.macroCategory}|${category.name}|${causale}|${buildMonthKey(selectedYear, month.monthIndex)}`) ? 'border-sky-400 ring-1 ring-sky-200' : 'border-gray-300'}`} 
                                      value={getPlanPreventivoValue(group.macroCategory, category.name, causale, selectedYear, month.monthIndex)} 
                                      onChange={(e) => setOverride('preventivo', group.macroCategory, category.name, causale, selectedYear, month.monthIndex, Number(e.target.value))} 
                                    />
                                  )}
                                </td>
                              )}
                              <td className="px-3 py-2 text-right text-sm text-gray-700">
                                <div className="text-gray-800">{formatCurrencyValue(getPlanConsuntivoValue(group.macroCategory, category.name, causale, selectedYear, month.monthIndex))}</div>
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
          
          {/* UTILE DI CASSA - Calcolato automaticamente */}
          <tr className="bg-emerald-50 text-sm font-bold uppercase text-emerald-800">
            <td className="px-3 py-3 sticky left-0 bg-emerald-50 z-10 w-48" colSpan={3 + MONTH_NAMES.length * (onlyConsuntivo ? 1 : 2)}>
              UTILE DI CASSA
            </td>
          </tr>
          <tr className="bg-emerald-100 font-semibold">
            <td className="px-3 py-2 text-sm text-gray-700 sticky left-0 bg-emerald-100 z-10 w-48">Utile di cassa</td>
            {(() => {
              const utileCassaSum = MONTH_NAMES.reduce((acc, _, monthIndex) => {
                return acc + calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
              }, 0);
              
              // Calculate progressive incidence: sum of (monthly_utile / monthly_incassato) for each month
              let totalPercentage = 0;
              MONTH_NAMES.forEach((_, monthIndex) => {
                const monthlyIncassato = getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
                const monthlyUtile = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
                if (monthlyIncassato > 0) {
                  totalPercentage += (monthlyUtile / monthlyIncassato) * 100;
                }
              });
              
              return (
                <>
                  <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                    <div className="font-semibold text-emerald-700">{formatCurrencyValue(utileCassaSum)}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-sm">
                    <div className="font-semibold text-emerald-700">{totalPercentage.toFixed(1)}%</div>
                  </td>
                </>
              );
            })()}
            {MONTH_NAMES.map((_, monthIndex) => {
              // Calcolo per PREVENTIVO - using the same logic but with preventivo values
              const utileCassaPreventivo = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanPreventivoValue, selectedYear, monthIndex);

              // Calcolo per CONSUNTIVO
              const utileCassaConsuntivo = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, selectedYear, monthIndex);
              
              return (
                <React.Fragment key={`utile-cassa-${monthIndex}`}>
                  {!onlyConsuntivo && (
                    <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                      <div className="font-semibold text-sky-700">{formatCurrencyValue(utileCassaPreventivo)}</div>
                    </td>
                  )}
                  <td className="px-3 py-2 text-right text-sm">
                    <div className="font-semibold text-emerald-700">{formatCurrencyValue(utileCassaConsuntivo)}</div>
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
