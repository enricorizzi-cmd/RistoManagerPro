import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XIcon } from '../icons/Icons';
import type { RawMaterial } from './types';

interface MateriePrimeProps {
  rawMaterials: RawMaterial[];
  onAdd: (material: Omit<RawMaterial, 'id'>) => void;
  onUpdate: (id: string, material: Omit<RawMaterial, 'id'>) => void;
  onDelete: (id: string) => void;
  onManageTipologia: () => void;
  onManageCategoria: () => void;
  onManageMateriaPrima: () => void;
  onManageFornitore: () => void;
}

const MateriePrime: React.FC<MateriePrimeProps> = ({
  rawMaterials,
  onAdd,
  onUpdate,
  onDelete,
  onManageTipologia,
  onManageCategoria,
  onManageMateriaPrima,
  onManageFornitore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipologia: '',
    categoria: '',
    codice: '',
    materiaPrima: '',
    unitaMisura: 'KG' as 'KG' | 'LT' | 'PZ',
    fornitore: '',
    prezzoAcquisto: '',
    dataUltimoAcquisto: '',
  });

  // Filters
  const [filters, setFilters] = useState({
    tipologia: '',
    categoria: '',
    materiaPrima: '',
    fornitore: '',
  });

  // Extract unique values for dropdowns
  const tipologie = useMemo(
    () => Array.from(new Set(rawMaterials.map(m => m.tipologia))).sort(),
    [rawMaterials]
  );
  const categorie = useMemo(
    () => Array.from(new Set(rawMaterials.map(m => m.categoria))).sort(),
    [rawMaterials]
  );
  const materiePrime = useMemo(
    () => Array.from(new Set(rawMaterials.map(m => m.materiaPrima))).sort(),
    [rawMaterials]
  );
  const fornitori = useMemo(
    () => Array.from(new Set(rawMaterials.map(m => m.fornitore))).sort(),
    [rawMaterials]
  );

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter(m => {
      if (filters.tipologia && m.tipologia !== filters.tipologia) return false;
      if (filters.categoria && m.categoria !== filters.categoria) return false;
      if (filters.materiaPrima && m.materiaPrima !== filters.materiaPrima)
        return false;
      if (filters.fornitore && m.fornitore !== filters.fornitore) return false;
      return true;
    });
  }, [rawMaterials, filters]);

  const handleOpenModal = (material?: RawMaterial) => {
    if (material) {
      setEditingId(material.id);
      setFormData({
        tipologia: material.tipologia,
        categoria: material.categoria,
        codice: material.codice,
        materiaPrima: material.materiaPrima,
        unitaMisura: material.unitaMisura,
        fornitore: material.fornitore,
        prezzoAcquisto: material.prezzoAcquisto.toString(),
        dataUltimoAcquisto: material.dataUltimoAcquisto.split('T')[0],
      });
    } else {
      setEditingId(null);
      setFormData({
        tipologia: '',
        categoria: '',
        codice: '',
        materiaPrima: '',
        unitaMisura: 'KG',
        fornitore: '',
        prezzoAcquisto: '',
        dataUltimoAcquisto: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (
      !formData.tipologia ||
      !formData.categoria ||
      !formData.codice ||
      !formData.materiaPrima ||
      !formData.fornitore ||
      !formData.prezzoAcquisto
    ) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const materialData = {
      tipologia: formData.tipologia,
      categoria: formData.categoria,
      codice: formData.codice,
      materiaPrima: formData.materiaPrima,
      unitaMisura: formData.unitaMisura,
      fornitore: formData.fornitore,
      prezzoAcquisto: parseFloat(formData.prezzoAcquisto),
      dataUltimoAcquisto: new Date(formData.dataUltimoAcquisto).toISOString(),
    };

    if (editingId) {
      onUpdate(editingId, materialData);
    } else {
      onAdd(materialData);
    }

    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materie Prime</h2>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci le materie prime e i loro costi
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Aggiungi Materia Prima</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipologia
            </label>
            <div className="flex gap-1">
              <select
                value={filters.tipologia}
                onChange={e =>
                  setFilters({ ...filters, tipologia: e.target.value })
                }
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tutte</option>
                {tipologie.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                onClick={onManageTipologia}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                title="Gestisci tipologie"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <div className="flex gap-1">
              <select
                value={filters.categoria}
                onChange={e =>
                  setFilters({ ...filters, categoria: e.target.value })
                }
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tutte</option>
                {categorie.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={onManageCategoria}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                title="Gestisci categorie"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Materia Prima
            </label>
            <div className="flex gap-1">
              <select
                value={filters.materiaPrima}
                onChange={e =>
                  setFilters({ ...filters, materiaPrima: e.target.value })
                }
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tutte</option>
                {materiePrime.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                onClick={onManageMateriaPrima}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                title="Gestisci materie prime"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fornitore
            </label>
            <div className="flex gap-1">
              <select
                value={filters.fornitore}
                onChange={e =>
                  setFilters({ ...filters, fornitore: e.target.value })
                }
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tutti</option>
                {fornitori.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <button
                onClick={onManageFornitore}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                title="Gestisci fornitori"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipologia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Materia Prima
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornitore
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prezzo Acquisto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Ultimo Acquisto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nessuna materia prima trovata
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(material => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {material.tipologia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {material.categoria}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.codice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {material.materiaPrima}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {material.unitaMisura}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {material.fornitore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{material.prezzoAcquisto.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(material.dataUltimoAcquisto).toLocaleDateString(
                        'it-IT'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(material)}
                          className="text-primary hover:text-primary-600"
                          title="Modifica"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                'Sei sicuro di voler eliminare questa materia prima?'
                              )
                            ) {
                              onDelete(material.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Elimina"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Modifica Materia Prima' : 'Nuova Materia Prima'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipologia *
                </label>
                <div className="flex gap-1">
                  <select
                    value={formData.tipologia}
                    onChange={e =>
                      setFormData({ ...formData, tipologia: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleziona...</option>
                    {tipologie.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onManageTipologia}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    title="Gestisci"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <div className="flex gap-1">
                  <select
                    value={formData.categoria}
                    onChange={e =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleziona...</option>
                    {categorie.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onManageCategoria}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    title="Gestisci"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice *
                </label>
                <input
                  type="text"
                  value={formData.codice}
                  onChange={e =>
                    setFormData({ ...formData, codice: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Materia Prima *
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={formData.materiaPrima}
                    onChange={e =>
                      setFormData({ ...formData, materiaPrima: e.target.value })
                    }
                    list="materie-prime-list"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <datalist id="materie-prime-list">
                    {materiePrime.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <button
                    onClick={onManageMateriaPrima}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    title="Gestisci"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unità di Misura *
                </label>
                <select
                  value={formData.unitaMisura}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      unitaMisura: e.target.value as 'KG' | 'LT' | 'PZ',
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="KG">KG</option>
                  <option value="LT">LT</option>
                  <option value="PZ">PZ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornitore *
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={formData.fornitore}
                    onChange={e =>
                      setFormData({ ...formData, fornitore: e.target.value })
                    }
                    list="fornitori-list"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <datalist id="fornitori-list">
                    {fornitori.map(f => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                  <button
                    onClick={onManageFornitore}
                    className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    title="Gestisci"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prezzo di Acquisto (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prezzoAcquisto}
                  onChange={e =>
                    setFormData({ ...formData, prezzoAcquisto: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Ultimo Acquisto *
                </label>
                <input
                  type="date"
                  value={formData.dataUltimoAcquisto}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      dataUltimoAcquisto: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {editingId ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriePrime;
