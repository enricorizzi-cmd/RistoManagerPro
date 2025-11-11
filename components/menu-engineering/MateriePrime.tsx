import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XIcon } from '../icons/Icons';
import SearchableSelect from '../ui/SearchableSelect';
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
  tipologie?: string[];
  categorie?: string[];
  materiePrime?: string[];
  fornitori?: string[];
  isReadOnly?: boolean;
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
  tipologie: tipologieProp,
  categorie: categorieProp,
  materiePrime: materiePrimeProp,
  fornitori: fornitoriProp,
  isReadOnly = false,
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

  // Use provided values or extract from materials
  const tipologie = useMemo(() => {
    if (tipologieProp) {
      return tipologieProp;
    }
    return Array.from(new Set(rawMaterials.map(m => m.tipologia)))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .sort();
  }, [rawMaterials, tipologieProp]);

  const categorie = useMemo(() => {
    if (categorieProp) {
      return categorieProp;
    }
    return Array.from(new Set(rawMaterials.map(m => m.categoria)))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .sort();
  }, [rawMaterials, categorieProp]);

  const materiePrime = useMemo(() => {
    if (materiePrimeProp) {
      return materiePrimeProp;
    }
    return Array.from(new Set(rawMaterials.map(m => m.materiaPrima)))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .sort();
  }, [rawMaterials, materiePrimeProp]);

  const fornitori = useMemo(() => {
    if (fornitoriProp) {
      return fornitoriProp;
    }
    return Array.from(new Set(rawMaterials.map(m => m.fornitore)))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .sort();
  }, [rawMaterials, fornitoriProp]);

  // Filtered and sorted materials (by data ultimo acquisto, most recent first)
  const filteredMaterials = useMemo(() => {
    const filtered = rawMaterials.filter(m => {
      if (filters.tipologia && m.tipologia !== filters.tipologia) return false;
      if (filters.categoria && m.categoria !== filters.categoria) return false;
      if (filters.materiaPrima && m.materiaPrima !== filters.materiaPrima)
        return false;
      if (filters.fornitore && m.fornitore !== filters.fornitore) return false;
      return true;
    });
    // Sort by data ultimo acquisto (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dataUltimoAcquisto).getTime();
      const dateB = new Date(b.dataUltimoAcquisto).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });
  }, [rawMaterials, filters]);

  // Generate next available codice (progressive, 3 digits with zero padding)
  const generateNextCodice = useMemo(() => {
    if (rawMaterials.length === 0) {
      return '001';
    }

    // Extract numeric part from existing codici (assumes format like "001", "002", etc.)
    const codiciNumerici = rawMaterials
      .map(m => {
        // Try to extract numeric value from codice
        const match = m.codice.match(/^(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    if (codiciNumerici.length === 0) {
      return '001';
    }

    const maxCodice = Math.max(...codiciNumerici);
    const nextCodice = maxCodice + 1;

    // Format with zero padding (3 digits: 001, 002, ..., 999)
    return nextCodice.toString().padStart(3, '0');
  }, [rawMaterials]);

  const handleOpenModal = (material?: RawMaterial) => {
    if (material) {
      // Editing existing material
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
      // Adding new material - auto-generate codice
      setEditingId(null);
      setFormData({
        tipologia: '',
        categoria: '',
        codice: generateNextCodice,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Materie Prime
          </h2>
          <p className="mt-1 text-xs md:text-sm text-gray-600">
            Gestisci le materie prime e i loro costi
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm w-full sm:w-auto justify-center text-sm md:text-base"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Aggiungi Materia Prima</span>
          </button>
        )}
        {isReadOnly && (
          <div className="text-xs md:text-sm text-gray-500 italic">
            Visualizzazione aggregata - Modifiche non disponibili
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipologia
            </label>
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchableSelect
                  value={filters.tipologia}
                  onChange={value =>
                    setFilters({ ...filters, tipologia: value })
                  }
                  options={tipologie}
                  placeholder="Cerca tipologia..."
                  emptyOption="Tutte"
                  className="text-sm"
                />
              </div>
              {!isReadOnly && (
                <button
                  onClick={onManageTipologia}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                  title="Gestisci tipologie"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchableSelect
                  value={filters.categoria}
                  onChange={value =>
                    setFilters({ ...filters, categoria: value })
                  }
                  options={categorie}
                  placeholder="Cerca categoria..."
                  emptyOption="Tutte"
                  className="text-sm"
                />
              </div>
              {!isReadOnly && (
                <button
                  onClick={onManageCategoria}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                  title="Gestisci categorie"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Materia Prima
            </label>
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchableSelect
                  value={filters.materiaPrima}
                  onChange={value =>
                    setFilters({ ...filters, materiaPrima: value })
                  }
                  options={materiePrime}
                  placeholder="Cerca materia prima..."
                  emptyOption="Tutte"
                  className="text-sm"
                />
              </div>
              {!isReadOnly && (
                <button
                  onClick={onManageMateriaPrima}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                  title="Gestisci materie prime"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fornitore
            </label>
            <div className="flex gap-1">
              <div className="flex-1">
                <SearchableSelect
                  value={filters.fornitore}
                  onChange={value =>
                    setFilters({ ...filters, fornitore: value })
                  }
                  options={fornitori}
                  placeholder="Cerca fornitore..."
                  emptyOption="Tutti"
                  className="text-sm"
                />
              </div>
              {!isReadOnly && (
                <button
                  onClick={onManageFornitore}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                  title="Gestisci fornitori"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
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
                {!isReadOnly && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td
                    colSpan={isReadOnly ? 8 : 9}
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
                    {!isReadOnly && (
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
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-70 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto shadow-xl">
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
                  <div className="flex-1">
                    <SearchableSelect
                      value={formData.tipologia}
                      onChange={value =>
                        setFormData({ ...formData, tipologia: value })
                      }
                      options={tipologie}
                      placeholder="Cerca tipologia..."
                      emptyOption="Seleziona..."
                      className="text-sm"
                    />
                  </div>
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
                  <div className="flex-1">
                    <SearchableSelect
                      value={formData.categoria}
                      onChange={value =>
                        setFormData({ ...formData, categoria: value })
                      }
                      options={categorie}
                      placeholder="Cerca categoria..."
                      emptyOption="Seleziona..."
                      className="text-sm"
                    />
                  </div>
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
                  readOnly={!editingId}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                    !editingId ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  title={
                    !editingId
                      ? 'Il codice viene generato automaticamente'
                      : 'Codice materia prima'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Materia Prima *
                </label>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <SearchableSelect
                      value={formData.materiaPrima}
                      onChange={value =>
                        setFormData({ ...formData, materiaPrima: value })
                      }
                      options={materiePrime}
                      placeholder="Cerca materia prima..."
                      emptyOption="Seleziona..."
                      className="text-sm"
                    />
                  </div>
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
                  <div className="flex-1">
                    <SearchableSelect
                      value={formData.fornitore}
                      onChange={value =>
                        setFormData({ ...formData, fornitore: value })
                      }
                      options={fornitori}
                      placeholder="Cerca fornitore..."
                      emptyOption="Seleziona..."
                      className="text-sm"
                    />
                  </div>
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

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm md:text-base"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm md:text-base font-medium"
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
