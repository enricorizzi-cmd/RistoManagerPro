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
  periodoMode: boolean;
  selectedFromMonth: number;
  selectedFromYear: number;
  selectedToMonth: number;
  selectedToYear: number;
  causaliCatalog: FinancialCausaleGroup[];
  editMode: boolean;
  onlyValued: boolean;
  onlyConsuntivo: boolean;
  showPrevisionaleTotals: boolean;
  dirtyKeys: Set<string>;
  loadingState: boolean;
  getPlanPreventivoValue: (_macro: string, _category: string, _detail: string, _year: number, _monthIndex: number) => number;
  getPlanConsuntivoValue: (_macro: string, _category: string, _detail: string, _year: number, _monthIndex: number) => number;
  setOverride: (_target: 'preventivo' | 'consuntivo', _macro: string, _category: string, _detail: string, _year: number, _monthIndex: number, _value: number | null) => void;
  consuntivoOverrides?: any;
}

export const PlanTable: React.FC<PlanTableProps> = ({
  planYear,
  selectedYear,
  periodoMode,
  selectedFromMonth,
  selectedFromYear,
  selectedToMonth,
  selectedToYear,
  causaliCatalog,
  editMode,
  onlyValued,
  onlyConsuntivo,
  showPrevisionaleTotals,
  dirtyKeys,
  loadingState,
  getPlanPreventivoValue,
  getPlanConsuntivoValue,
  setOverride,
  consuntivoOverrides: _consuntivoOverrides = {},
}) => {
  // Generate months based on periodo mode
  const getMonthsToShow = () => {
    if (!periodoMode) {
      // Default: show all 12 months of selected year
      return MONTH_NAMES.map((name, index) => ({ name, monthIndex: index, year: selectedYear }));
    } else {
      // Periodo mode: show months from selectedFrom to selectedTo
      const months = [];
      let currentYear = selectedFromYear;
      let currentMonth = selectedFromMonth;
      
      while (currentYear < selectedToYear || (currentYear === selectedToYear && currentMonth <= selectedToMonth)) {
        months.push({
          name: MONTH_NAMES[currentMonth],
          monthIndex: currentMonth,
          year: currentYear
        });
        
        currentMonth++;
        if (currentMonth >= 12) {
          currentMonth = 0;
          currentYear++;
        }
      }
      
      return months;
    }
  };

  const monthsToShow = getMonthsToShow();
  const rowHasAnyValue = useCallback((
    macro: string,
    category: string,
    detail: string,
    year: number,
  ): boolean => {
    if (!periodoMode) {
      // Default: check all 12 months of the year
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const p = getPlanPreventivoValue(macro, category, detail, year, monthIndex);
        const c = getPlanConsuntivoValue(macro, category, detail, year, monthIndex);
        if ((p ?? 0) !== 0 || (c ?? 0) !== 0) return true;
      }
    } else {
      // Periodo mode: check only months in the selected period
      for (const month of monthsToShow) {
        const p = getPlanPreventivoValue(macro, category, detail, month.year, month.monthIndex);
        const c = getPlanConsuntivoValue(macro, category, detail, month.year, month.monthIndex);
        if ((p ?? 0) !== 0 || (c ?? 0) !== 0) return true;
      }
    }
    return false;
  }, [getPlanPreventivoValue, getPlanConsuntivoValue, periodoMode, monthsToShow]);

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
            {showPrevisionaleTotals && (
              <>
                <th className="px-3 py-3 text-center border-l-2 border-gray-300 bg-slate-50 sticky top-0 z-20">SOMMA PREVISIONALE</th>
                <th className="px-3 py-3 text-center bg-slate-50 sticky top-0 z-20">INCIDENZA PREVISIONALE</th>
              </>
            )}
            {monthsToShow.map((month) => (
              <th key={`${month.year}-${month.monthIndex}`} className="px-3 py-3 text-center border-l-2 border-gray-300 bg-slate-50 sticky top-0 z-20" colSpan={onlyConsuntivo ? 1 : 2}>
                {month.name} {month.year}
              </th>
            ))}
          </tr>
          <tr>
            <th className="px-3 py-2 bg-slate-50 sticky top-[3rem] left-0 z-30 w-48"></th>
            <th className="px-3 py-2 text-center text-xs font-normal border-l-2 border-gray-300 bg-slate-50 sticky top-[3rem] z-20">TOTALE</th>
            <th className="px-3 py-2 text-center text-xs font-normal bg-slate-50 sticky top-[3rem] z-20">%</th>
            {showPrevisionaleTotals && (
              <>
                <th className="px-3 py-2 text-center text-xs font-normal border-l-2 border-gray-300 bg-slate-50 sticky top-[3rem] z-20">TOTALE</th>
                <th className="px-3 py-2 text-center text-xs font-normal bg-slate-50 sticky top-[3rem] z-20">%</th>
              </>
            )}
            {monthsToShow.map((month) => (
              <React.Fragment key={`${month.year}-${month.monthIndex}`}>
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
                      catAcc + monthsToShow.reduce((monthAcc, month) => 
                        monthAcc + getPlanConsuntivoValue(group.macroCategory, cat.name, d.detail, month.year, month.monthIndex), 0
                      ), 0
                    );
                  }, 0);
                  
                  // Calculate progressive incidence: (macroSum / totalIncassato) * 100
                  // For INCASSATO, use the macroSum itself as the total (100% of itself)
                  // For other categories, calculate based on total INCASSATO
                  let totalIncassato = 0;
                  if (group.macroId === 1) { // INCASSATO
                    totalIncassato = macroSum; // Use the macroSum itself
                  } else {
                    // Calculate total INCASSATO from all months
                    totalIncassato = monthsToShow.reduce((acc, month) => 
                      acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex), 0
                    );
                  }
                  
                  const percentage = totalIncassato === 0 ? 0 : (macroSum / totalIncassato) * 100;
                  
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
                {showPrevisionaleTotals && (() => {
                  const macroPrevisionaleSum = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + monthsToShow.reduce((monthAcc, month) => 
                        monthAcc + getPlanPreventivoValue(group.macroCategory, cat.name, d.detail, month.year, month.monthIndex), 0
                      ), 0
                    );
                  }, 0);
                  
                  // Calculate progressive incidence for previsionale: (macroPrevisionaleSum / totalIncassatoPrevisionale) * 100
                  let totalIncassatoPrevisionale = 0;
                  if (group.macroId === 1) { // INCASSATO
                    totalIncassatoPrevisionale = macroPrevisionaleSum; // Use the macroSum itself
                  } else {
                    // Calculate total INCASSATO PREVISIONALE from all months
                    totalIncassatoPrevisionale = monthsToShow.reduce((acc, month) => 
                      acc + getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex), 0
                    );
                  }
                  
                  const percentagePrevisionale = totalIncassatoPrevisionale === 0 ? 0 : (macroPrevisionaleSum / totalIncassatoPrevisionale) * 100;
                  
                  return (
                    <>
                      <td className="px-3 py-3 text-right border-l-2 border-gray-300">
                        {formatCurrencyValue(macroPrevisionaleSum)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {percentagePrevisionale.toFixed(1)}%
                      </td>
                    </>
                  );
                })()}
                {monthsToShow.map((month) => {
                  const p = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + getPlanPreventivoValue(group.macroCategory, cat.name, d.detail, month.year, month.monthIndex), 0
                    );
                  }, 0);
                  const c = group.categories.reduce((acc, cat) => {
                    const macro = planYear?.macros.find(m => m.macro === group.macroCategory);
                    const categoryDetails = macro?.details?.filter(d => d.category === cat.name) ?? [];
                    return acc + categoryDetails.reduce((catAcc, d) => 
                      catAcc + getPlanConsuntivoValue(group.macroCategory, cat.name, d.detail, month.year, month.monthIndex), 0
                    );
                  }, 0);
                  
                  return (
                    <React.Fragment key={`macro-header-${month.year}-${month.monthIndex}`}>
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
                          acc + monthsToShow.reduce((monthAcc, month) => 
                            monthAcc + getPlanConsuntivoValue(group.macroCategory, category.name, d.detail, month.year, month.monthIndex), 0
                          ), 0
                        );
                        
                        // Calculate progressive incidence: (categorySum / totalIncassato) * 100
                        const totalIncassato = monthsToShow.reduce((acc, month) => 
                          acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex), 0
                        );
                        const totalPercentage = totalIncassato === 0 ? 0 : (categorySum / totalIncassato) * 100;
                        
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
                      {showPrevisionaleTotals && (() => {
                        const categoryPrevisionaleSum = categoryDetails.reduce((acc, d) => 
                          acc + monthsToShow.reduce((monthAcc, month) => 
                            monthAcc + getPlanPreventivoValue(group.macroCategory, category.name, d.detail, month.year, month.monthIndex), 0
                          ), 0
                        );
                        
                        // Calculate progressive incidence for previsionale: (categoryPrevisionaleSum / totalIncassatoPrevisionale) * 100
                        const totalIncassatoPrevisionale = monthsToShow.reduce((acc, month) => 
                          acc + getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex), 0
                        );
                        const totalPercentagePrevisionale = totalIncassatoPrevisionale === 0 ? 0 : (categoryPrevisionaleSum / totalIncassatoPrevisionale) * 100;
                        
                        return (
                          <>
                            <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                              <div className="font-semibold text-purple-700">{formatCurrencyValue(categoryPrevisionaleSum)}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              <div className="font-semibold text-purple-700">{totalPercentagePrevisionale.toFixed(1)}%</div>
                            </td>
                          </>
                        );
                      })()}
                      {monthsToShow.map((month) => {
                        const p = categoryDetails.reduce((acc, d) => acc + getPlanPreventivoValue(group.macroCategory, category.name, d.detail, month.year, month.monthIndex), 0);
                        const c = categoryDetails.reduce((acc, d) => acc + getPlanConsuntivoValue(group.macroCategory, category.name, d.detail, month.year, month.monthIndex), 0);
                        return (
                          <React.Fragment key={`subtotal-${month.year}-${month.monthIndex}`}>
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
                            const causaleSum = monthsToShow.reduce((acc, month) => 
                              acc + getPlanConsuntivoValue(group.macroCategory, category.name, causale, month.year, month.monthIndex), 0
                            );
                            
                            // Calculate progressive incidence: (causaleSum / totalIncassato) * 100
                            const totalIncassato = monthsToShow.reduce((acc, month) => 
                              acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex), 0
                            );
                            const totalPercentage = totalIncassato === 0 ? 0 : (causaleSum / totalIncassato) * 100;
                            
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
                          {showPrevisionaleTotals && (() => {
                            const causalePrevisionaleSum = monthsToShow.reduce((acc, month) => 
                              acc + getPlanPreventivoValue(group.macroCategory, category.name, causale, month.year, month.monthIndex), 0
                            );
                            
                            // Calculate progressive incidence for previsionale: (causalePrevisionaleSum / totalIncassatoPrevisionale) * 100
                            const totalIncassatoPrevisionale = monthsToShow.reduce((acc, month) => 
                              acc + getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex), 0
                            );
                            const totalPercentagePrevisionale = totalIncassatoPrevisionale === 0 ? 0 : (causalePrevisionaleSum / totalIncassatoPrevisionale) * 100;
                            
                            return (
                              <>
                                <td className="px-3 py-2 text-right text-sm text-gray-700 border-l-2 border-gray-200">
                                  <div className="text-purple-700">{formatCurrencyValue(causalePrevisionaleSum)}</div>
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-gray-700">
                                  <div className="text-purple-700">{totalPercentagePrevisionale.toFixed(1)}%</div>
                                </td>
                              </>
                            );
                          })()}
                          {monthsToShow.map((month) => (
                            <React.Fragment key={`${month.year}-${month.monthIndex}`}>
                              {!onlyConsuntivo && (
                                <td className="px-3 py-2 text-right text-sm text-gray-700 border-l-2 border-gray-200">
                                  {!editMode ? (
                                    <div className="text-sky-700">{formatCurrencyValue(getPlanPreventivoValue(group.macroCategory, category.name, causale, month.year, month.monthIndex))}</div>
                                  ) : (
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      className={`w-28 rounded border px-2 py-1 text-right text-sm ${dirtyKeys.has(`preventivo|${group.macroCategory}|${category.name}|${causale}|${buildMonthKey(month.year, month.monthIndex)}`) ? 'border-sky-400 ring-1 ring-sky-200' : 'border-gray-300'}`} 
                                      value={getPlanPreventivoValue(group.macroCategory, category.name, causale, month.year, month.monthIndex)} 
                                      onChange={(e) => setOverride('preventivo', group.macroCategory, category.name, causale, month.year, month.monthIndex, Number(e.target.value))} 
                                    />
                                  )}
                                </td>
                              )}
                              <td className="px-3 py-2 text-right text-sm text-gray-700">
                                <div className="text-gray-800">{formatCurrencyValue(getPlanConsuntivoValue(group.macroCategory, category.name, causale, month.year, month.monthIndex))}</div>
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
            <td className="px-3 py-3 sticky left-0 bg-emerald-50 z-10 w-48" colSpan={3 + (showPrevisionaleTotals ? 2 : 0) + monthsToShow.length * (onlyConsuntivo ? 1 : 2)}>
              UTILE DI CASSA
            </td>
          </tr>
          <tr className="bg-emerald-100 font-semibold">
            <td className="px-3 py-2 text-sm text-gray-700 sticky left-0 bg-emerald-100 z-10 w-48">Utile di cassa</td>
            {(() => {
              const utileCassaSum = monthsToShow.reduce((acc, month) => {
                return acc + calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex);
              }, 0);
              
              // Calculate progressive incidence: (utileCassaSum / totalIncassato) * 100
              const totalIncassato = monthsToShow.reduce((acc, month) => 
                acc + getIncassatoTotal(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex), 0
              );
              const totalPercentage = totalIncassato === 0 ? 0 : (utileCassaSum / totalIncassato) * 100;
              
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
            {showPrevisionaleTotals && (() => {
              const utileCassaPrevisionaleSum = monthsToShow.reduce((acc, month) => {
                return acc + calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex);
              }, 0);
              
              // Calculate progressive incidence for previsionale: (utileCassaPrevisionaleSum / totalIncassatoPrevisionale) * 100
              const totalIncassatoPrevisionale = monthsToShow.reduce((acc, month) => 
                acc + getIncassatoTotal(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex), 0
              );
              const totalPercentagePrevisionale = totalIncassatoPrevisionale === 0 ? 0 : (utileCassaPrevisionaleSum / totalIncassatoPrevisionale) * 100;
              
              return (
                <>
                  <td className="px-3 py-2 text-right text-sm border-l-2 border-gray-200">
                    <div className="font-semibold text-purple-700">{formatCurrencyValue(utileCassaPrevisionaleSum)}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-sm">
                    <div className="font-semibold text-purple-700">{totalPercentagePrevisionale.toFixed(1)}%</div>
                  </td>
                </>
              );
            })()}
            {monthsToShow.map((month) => {
              // Calcolo per PREVENTIVO - using the same logic but with preventivo values
              const utileCassaPreventivo = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanPreventivoValue, month.year, month.monthIndex);

              // Calcolo per CONSUNTIVO
              const utileCassaConsuntivo = calculateUtileFromMacroTotals(causaliCatalog, planYear, getPlanConsuntivoValue, month.year, month.monthIndex);
              
              return (
                <React.Fragment key={`utile-cassa-${month.year}-${month.monthIndex}`}>
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
