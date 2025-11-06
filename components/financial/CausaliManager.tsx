// Causali Manager Component
// Manages financial causali catalog

import React, { useState } from 'react';
import type { FinancialCausaleGroup } from '../../data/financialPlanData';

interface CausaliManagerProps {
  causaliCatalog: FinancialCausaleGroup[];
  onCausaliPersist: (causali: FinancialCausaleGroup[]) => Promise<boolean>;
}

export const CausaliManager: React.FC<CausaliManagerProps> = ({
  causaliCatalog,
  onCausaliPersist,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const handleAddMacro = () => {
    const macro = window.prompt('Nome macro (es. COSTI FISSI)');
    if (!macro) return;
    onCausaliPersist([
      ...causaliCatalog,
      { macroCategory: macro, categories: [] },
    ]);
  };

  const handleRenameMacro = (index: number, currentName: string) => {
    const name = window.prompt('Rinomina macro', currentName) ?? currentName;
    const next = [...causaliCatalog];
    next[index] = { ...next[index], macroCategory: name };
    onCausaliPersist(next);
  };

  const handleDeleteMacro = (index: number) => {
    if (!window.confirm('Eliminare tipologia e tutte le categorie?')) return;
    const next = causaliCatalog.filter((_, idx) => idx !== index);
    onCausaliPersist(next);
  };

  const handleAddCategory = (macroIndex: number) => {
    const name = window.prompt('Nome nuova categoria');
    if (!name) return;
    const next = [...causaliCatalog];
    next[macroIndex] = {
      ...next[macroIndex],
      categories: [...next[macroIndex].categories, { name, items: [] }],
    };
    onCausaliPersist(next);
  };

  const handleRenameCategory = (
    macroIndex: number,
    categoryIndex: number,
    currentName: string
  ) => {
    const name =
      window.prompt('Rinomina categoria', currentName) ?? currentName;
    const next = [...causaliCatalog];
    next[macroIndex].categories[categoryIndex] = {
      ...next[macroIndex].categories[categoryIndex],
      name,
    };
    onCausaliPersist(next);
  };

  const handleDeleteCategory = (macroIndex: number, categoryIndex: number) => {
    if (!window.confirm('Eliminare categoria?')) return;
    const next = [...causaliCatalog];
    next[macroIndex].categories.splice(categoryIndex, 1);
    onCausaliPersist(next);
  };

  const handleAddCausale = (macroIndex: number, categoryIndex: number) => {
    const name = window.prompt('Nome causale');
    if (!name) return;
    const next = [...causaliCatalog];
    next[macroIndex].categories[categoryIndex] = {
      ...next[macroIndex].categories[categoryIndex],
      items: [...next[macroIndex].categories[categoryIndex].items, name],
    };
    onCausaliPersist(next);
  };

  const handleRenameCausale = (
    macroIndex: number,
    categoryIndex: number,
    causaleIndex: number,
    currentName: string
  ) => {
    const name = window.prompt('Rinomina causale', currentName) ?? currentName;
    const next = [...causaliCatalog];
    const items = [...next[macroIndex].categories[categoryIndex].items];
    items[causaleIndex] = name;
    next[macroIndex].categories[categoryIndex] = {
      ...next[macroIndex].categories[categoryIndex],
      items,
    };
    onCausaliPersist(next);
  };

  const handleDeleteCausale = (
    macroIndex: number,
    categoryIndex: number,
    causaleIndex: number
  ) => {
    if (!window.confirm('Eliminare causale?')) return;
    const next = [...causaliCatalog];
    const items = [...next[macroIndex].categories[categoryIndex].items];
    items.splice(causaleIndex, 1);
    next[macroIndex].categories[categoryIndex] = {
      ...next[macroIndex].categories[categoryIndex],
      items,
    };
    onCausaliPersist(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Catalogo causali
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              isEditMode ? 'bg-gray-500 text-white' : 'bg-blue-500 text-white'
            }`}
          >
            {isEditMode ? 'Chiudi modifica' : 'Modifica'}
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={handleAddMacro}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              Aggiungi tipologia
            </button>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {causaliCatalog.map((group, gi) => (
          <div
            key={`${group.macroCategory}-${gi}`}
            className="rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-800 flex-1">
                {group.macroCategory}
              </h4>
              {isEditMode && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRenameMacro(gi, group.macroCategory)}
                    className="text-xs px-2 py-1 rounded bg-slate-100"
                  >
                    Rinomina
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMacro(gi)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                  >
                    Elimina
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCategory(gi)}
                    className="text-xs px-2 py-1 rounded bg-primary text-white"
                  >
                    + Categoria
                  </button>
                </>
              )}
            </div>
            <div className="space-y-3">
              {group.categories.map((cat, ci) => (
                <div
                  key={`${cat.name}-${ci}`}
                  className="rounded border border-slate-200"
                >
                  <div className="flex items-center gap-2 p-2 bg-slate-50">
                    <div className="font-medium text-gray-800 flex-1">
                      {cat.name}
                    </div>
                    {isEditMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRenameCategory(gi, ci, cat.name)}
                          className="text-xs px-2 py-1 rounded bg-slate-100"
                        >
                          Rinomina
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(gi, ci)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                        >
                          Elimina
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCausale(gi, ci)}
                          className="text-xs px-2 py-1 rounded bg-primary text-white"
                        >
                          + Causale
                        </button>
                      </>
                    )}
                  </div>
                  <div className="p-2 flex flex-wrap gap-2">
                    {cat.items.map((item, ii) => (
                      <div
                        key={`${item}-${ii}`}
                        className="flex items-center gap-2 rounded bg-white border px-2 py-1"
                      >
                        <span className="text-sm text-gray-700">{item}</span>
                        {isEditMode && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleRenameCausale(gi, ci, ii, item)
                              }
                              className="text-xs px-2 py-0.5 rounded bg-slate-100"
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCausale(gi, ci, ii)}
                              className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700"
                            >
                              Elimina
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
