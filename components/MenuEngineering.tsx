import React, { useState, useMemo, useEffect } from 'react';
import MateriePrime from './menu-engineering/MateriePrime';
import Ricette from './menu-engineering/Ricette';
import MenuMix from './menu-engineering/MenuMix';
import ManageListModal from './menu-engineering/ManageListModal';
import { useMenuEngineering } from '../hooks/useMenuEngineering';
import { useAppContext } from '../contexts/AppContext';
import {
  getDropdownValues,
  saveDropdownValues,
} from '../services/menuEngineeringApi';
import type { MainTab } from './menu-engineering/types';

const MenuEngineering: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('materie-prime');
  const [showTipologiaModal, setShowTipologiaModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [showMateriaPrimaModal, setShowMateriaPrimaModal] = useState(false);
  const [showFornitoreModal, setShowFornitoreModal] = useState(false);
  const { showNotification, currentLocation } = useAppContext();

  const {
    rawMaterials,
    recipes,
    recipeSales,
    loading,
    error,
    handleAddRawMaterial,
    handleUpdateRawMaterial,
    handleDeleteRawMaterial,
    handleAddRecipe,
    handleUpdateRecipe,
    handleDeleteRecipe,
    handleReorderRecipes,
    loadData,
  } = useMenuEngineering();

  // State for dropdown values from database
  const [dropdownValues, setDropdownValues] = useState<{
    tipologie: string[];
    categorie: string[];
    materiePrime: string[];
    fornitori: string[];
  }>({
    tipologie: [],
    categorie: [],
    materiePrime: [],
    fornitori: [],
  });

  // Load dropdown values from database
  useEffect(() => {
    const loadDropdownValues = async () => {
      if (currentLocation?.id) {
        try {
          const [tipologie, categorie, materiePrime, fornitori] =
            await Promise.all([
              getDropdownValues(currentLocation.id, 'tipologia'),
              getDropdownValues(currentLocation.id, 'categoria'),
              getDropdownValues(currentLocation.id, 'materia_prima'),
              getDropdownValues(currentLocation.id, 'fornitore'),
            ]);

          setDropdownValues({
            tipologie,
            categorie,
            materiePrime,
            fornitori,
          });
        } catch (error) {
          console.error('Failed to load dropdown values:', error);
          // If table doesn't exist yet, start with empty arrays
          setDropdownValues({
            tipologie: [],
            categorie: [],
            materiePrime: [],
            fornitori: [],
          });
        }
      }
    };

    loadDropdownValues();
  }, [currentLocation?.id]);

  // Merge dropdown values from database with values from existing materials
  const tipologie = useMemo(() => {
    const fromMaterials = Array.from(
      new Set(rawMaterials.map(m => m.tipologia))
    );
    const fromDb = dropdownValues.tipologie;
    return Array.from(new Set([...fromDb, ...fromMaterials]))
      .filter(v => v && v.trim())
      .sort();
  }, [rawMaterials, dropdownValues.tipologie]);

  const categorie = useMemo(() => {
    const fromMaterials = Array.from(
      new Set(rawMaterials.map(m => m.categoria))
    );
    const fromDb = dropdownValues.categorie;
    return Array.from(new Set([...fromDb, ...fromMaterials]))
      .filter(v => v && v.trim())
      .sort();
  }, [rawMaterials, dropdownValues.categorie]);

  const materiePrime = useMemo(() => {
    const fromMaterials = Array.from(
      new Set(rawMaterials.map(m => m.materiaPrima))
    );
    const fromDb = dropdownValues.materiePrime;
    return Array.from(new Set([...fromDb, ...fromMaterials]))
      .filter(v => v && v.trim())
      .sort();
  }, [rawMaterials, dropdownValues.materiePrime]);

  const fornitori = useMemo(() => {
    const fromMaterials = Array.from(
      new Set(rawMaterials.map(m => m.fornitore))
    );
    const fromDb = dropdownValues.fornitori;
    return Array.from(new Set([...fromDb, ...fromMaterials]))
      .filter(v => v && v.trim())
      .sort();
  }, [rawMaterials, dropdownValues.fornitori]);

  // Wrap handlers with notifications
  const handleAddRawMaterialWithNotification = async (
    material: Parameters<typeof handleAddRawMaterial>[0]
  ) => {
    try {
      await handleAddRawMaterial(material);
      showNotification('Materia prima aggiunta con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'aggiunta della materia prima",
        'error'
      );
    }
  };

  const handleUpdateRawMaterialWithNotification = async (
    id: string,
    material: Parameters<typeof handleUpdateRawMaterial>[1]
  ) => {
    try {
      await handleUpdateRawMaterial(id, material);
      showNotification('Materia prima aggiornata con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'aggiornamento della materia prima",
        'error'
      );
    }
  };

  const handleDeleteRawMaterialWithNotification = async (id: string) => {
    try {
      await handleDeleteRawMaterial(id);
      showNotification('Materia prima eliminata con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'eliminazione della materia prima",
        'error'
      );
    }
  };

  const handleAddRecipeWithNotification = async (
    recipeData: Parameters<typeof handleAddRecipe>[0]
  ) => {
    try {
      await handleAddRecipe(recipeData);
      showNotification('Ricetta aggiunta con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'aggiunta della ricetta",
        'error'
      );
    }
  };

  const handleUpdateRecipeWithNotification = async (
    id: string,
    recipeData: Parameters<typeof handleUpdateRecipe>[1]
  ) => {
    try {
      await handleUpdateRecipe(id, recipeData);
      showNotification('Ricetta aggiornata con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'aggiornamento della ricetta",
        'error'
      );
    }
  };

  const handleDeleteRecipeWithNotification = async (id: string) => {
    try {
      await handleDeleteRecipe(id);
      showNotification('Ricetta eliminata con successo', 'success');
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Errore nell'eliminazione della ricetta",
        'error'
      );
    }
  };

  // Handle tipologia management
  const handleManageTipologia = async (newTipologie: string[]) => {
    if (!currentLocation?.id) {
      showNotification('Location ID richiesto', 'error');
      return;
    }

    try {
      // Find materials that need to be updated
      const materialsToUpdate: Array<{
        id: string;
        oldTipologia: string;
        newTipologia: string;
      }> = [];

      // Check for renamed tipologie
      const renamed: Map<string, string> = new Map();
      tipologie.forEach(old => {
        const found = newTipologie.find(
          newT => newT.toLowerCase() === old.toLowerCase()
        );
        if (!found && newTipologie.length >= tipologie.length) {
          // Try to find a similar one (case-insensitive match)
          const similar = newTipologie.find(
            newT =>
              newT.toLowerCase().includes(old.toLowerCase()) ||
              old.toLowerCase().includes(newT.toLowerCase())
          );
          if (similar) {
            renamed.set(old, similar);
          }
        }
      });

      // Update materials with renamed tipologie
      rawMaterials.forEach(material => {
        const newTipologia = renamed.get(material.tipologia);
        if (newTipologia && newTipologia !== material.tipologia) {
          materialsToUpdate.push({
            id: material.id,
            oldTipologia: material.tipologia,
            newTipologia: newTipologia,
          });
        } else if (!newTipologie.includes(material.tipologia)) {
          // Tipologia was deleted, set to first available or empty
          materialsToUpdate.push({
            id: material.id,
            oldTipologia: material.tipologia,
            newTipologia: newTipologie[0] || '',
          });
        }
      });

      // Update all affected materials
      for (const update of materialsToUpdate) {
        const material = rawMaterials.find(m => m.id === update.id);
        if (material) {
          await handleUpdateRawMaterial(update.id, {
            tipologia: update.newTipologia,
            categoria: material.categoria,
            codice: material.codice,
            materiaPrima: material.materiaPrima,
            unitaMisura: material.unitaMisura,
            fornitore: material.fornitore,
            prezzoAcquisto: material.prezzoAcquisto,
            dataUltimoAcquisto: material.dataUltimoAcquisto,
          });
        }
      }

      // Save dropdown values to database
      await saveDropdownValues(currentLocation.id, 'tipologia', newTipologie);

      // Update local state
      setDropdownValues(prev => ({
        ...prev,
        tipologie: newTipologie,
      }));

      // Reload data
      await loadData();
      showNotification('Tipologie aggiornate con successo', 'success');
    } catch (error) {
      console.error('Failed to update tipologie:', error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento delle tipologie",
        'error'
      );
      throw error;
    }
  };

  // Handle categoria management
  const handleManageCategoria = async (newCategorie: string[]) => {
    if (!currentLocation?.id) {
      showNotification('Location ID richiesto', 'error');
      return;
    }

    try {
      // Find materials that need to be updated
      const materialsToUpdate: Array<{
        id: string;
        oldCategoria: string;
        newCategoria: string;
      }> = [];

      // Check for renamed categorie
      const renamed: Map<string, string> = new Map();
      categorie.forEach(old => {
        const found = newCategorie.find(
          newC => newC.toLowerCase() === old.toLowerCase()
        );
        if (!found && newCategorie.length >= categorie.length) {
          const similar = newCategorie.find(
            newC =>
              newC.toLowerCase().includes(old.toLowerCase()) ||
              old.toLowerCase().includes(newC.toLowerCase())
          );
          if (similar) {
            renamed.set(old, similar);
          }
        }
      });

      // Update materials with renamed categorie
      rawMaterials.forEach(material => {
        const newCategoria = renamed.get(material.categoria);
        if (newCategoria && newCategoria !== material.categoria) {
          materialsToUpdate.push({
            id: material.id,
            oldCategoria: material.categoria,
            newCategoria: newCategoria,
          });
        } else if (!newCategorie.includes(material.categoria)) {
          // Categoria was deleted, set to first available or empty
          materialsToUpdate.push({
            id: material.id,
            oldCategoria: material.categoria,
            newCategoria: newCategorie[0] || '',
          });
        }
      });

      // Update all affected materials
      for (const update of materialsToUpdate) {
        const material = rawMaterials.find(m => m.id === update.id);
        if (material) {
          await handleUpdateRawMaterial(update.id, {
            tipologia: material.tipologia,
            categoria: update.newCategoria,
            codice: material.codice,
            materiaPrima: material.materiaPrima,
            unitaMisura: material.unitaMisura,
            fornitore: material.fornitore,
            prezzoAcquisto: material.prezzoAcquisto,
            dataUltimoAcquisto: material.dataUltimoAcquisto,
          });
        }
      }

      // Save dropdown values to database
      await saveDropdownValues(currentLocation.id, 'categoria', newCategorie);

      // Update local state
      setDropdownValues(prev => ({
        ...prev,
        categorie: newCategorie,
      }));

      // Reload data
      await loadData();
      showNotification('Categorie aggiornate con successo', 'success');
    } catch (error) {
      console.error('Failed to update categorie:', error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento delle categorie",
        'error'
      );
      throw error;
    }
  };

  // Handle materia prima management
  const handleManageMateriaPrima = async (newMateriePrime: string[]) => {
    if (!currentLocation?.id) {
      showNotification('Location ID richiesto', 'error');
      return;
    }

    try {
      // Find materials that need to be updated
      const materialsToUpdate: Array<{
        id: string;
        oldMateriaPrima: string;
        newMateriaPrima: string;
      }> = [];

      // Check for renamed materie prime
      const renamed: Map<string, string> = new Map();
      materiePrime.forEach(old => {
        const found = newMateriePrime.find(
          newM => newM.toLowerCase() === old.toLowerCase()
        );
        if (!found && newMateriePrime.length >= materiePrime.length) {
          const similar = newMateriePrime.find(
            newM =>
              newM.toLowerCase().includes(old.toLowerCase()) ||
              old.toLowerCase().includes(newM.toLowerCase())
          );
          if (similar) {
            renamed.set(old, similar);
          }
        }
      });

      // Update materials with renamed materie prime
      rawMaterials.forEach(material => {
        const newMateriaPrima = renamed.get(material.materiaPrima);
        if (newMateriaPrima && newMateriaPrima !== material.materiaPrima) {
          materialsToUpdate.push({
            id: material.id,
            oldMateriaPrima: material.materiaPrima,
            newMateriaPrima: newMateriaPrima,
          });
        } else if (!newMateriePrime.includes(material.materiaPrima)) {
          // Materia prima was deleted, set to first available or empty
          materialsToUpdate.push({
            id: material.id,
            oldMateriaPrima: material.materiaPrima,
            newMateriaPrima: newMateriePrime[0] || '',
          });
        }
      });

      // Update all affected materials
      for (const update of materialsToUpdate) {
        const material = rawMaterials.find(m => m.id === update.id);
        if (material) {
          await handleUpdateRawMaterial(update.id, {
            tipologia: material.tipologia,
            categoria: material.categoria,
            codice: material.codice,
            materiaPrima: update.newMateriaPrima,
            unitaMisura: material.unitaMisura,
            fornitore: material.fornitore,
            prezzoAcquisto: material.prezzoAcquisto,
            dataUltimoAcquisto: material.dataUltimoAcquisto,
          });
        }
      }

      // Save dropdown values to database
      await saveDropdownValues(
        currentLocation.id,
        'materia_prima',
        newMateriePrime
      );

      // Update local state
      setDropdownValues(prev => ({
        ...prev,
        materiePrime: newMateriePrime,
      }));

      // Reload data
      await loadData();
      showNotification('Materie prime aggiornate con successo', 'success');
    } catch (error) {
      console.error('Failed to update materie prime:', error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento delle materie prime",
        'error'
      );
      throw error;
    }
  };

  // Handle fornitore management
  const handleManageFornitore = async (newFornitori: string[]) => {
    if (!currentLocation?.id) {
      showNotification('Location ID richiesto', 'error');
      return;
    }

    try {
      // Find materials that need to be updated
      const materialsToUpdate: Array<{
        id: string;
        oldFornitore: string;
        newFornitore: string;
      }> = [];

      // Check for renamed fornitori
      const renamed: Map<string, string> = new Map();
      fornitori.forEach(old => {
        const found = newFornitori.find(
          newF => newF.toLowerCase() === old.toLowerCase()
        );
        if (!found && newFornitori.length >= fornitori.length) {
          const similar = newFornitori.find(
            newF =>
              newF.toLowerCase().includes(old.toLowerCase()) ||
              old.toLowerCase().includes(newF.toLowerCase())
          );
          if (similar) {
            renamed.set(old, similar);
          }
        }
      });

      // Update materials with renamed fornitori
      rawMaterials.forEach(material => {
        const newFornitore = renamed.get(material.fornitore);
        if (newFornitore && newFornitore !== material.fornitore) {
          materialsToUpdate.push({
            id: material.id,
            oldFornitore: material.fornitore,
            newFornitore: newFornitore,
          });
        } else if (!newFornitori.includes(material.fornitore)) {
          // Fornitore was deleted, set to first available or empty
          materialsToUpdate.push({
            id: material.id,
            oldFornitore: material.fornitore,
            newFornitore: newFornitori[0] || '',
          });
        }
      });

      // Update all affected materials
      for (const update of materialsToUpdate) {
        const material = rawMaterials.find(m => m.id === update.id);
        if (material) {
          await handleUpdateRawMaterial(update.id, {
            tipologia: material.tipologia,
            categoria: material.categoria,
            codice: material.codice,
            materiaPrima: material.materiaPrima,
            unitaMisura: material.unitaMisura,
            fornitore: update.newFornitore,
            prezzoAcquisto: material.prezzoAcquisto,
            dataUltimoAcquisto: material.dataUltimoAcquisto,
          });
        }
      }

      // Save dropdown values to database
      await saveDropdownValues(currentLocation.id, 'fornitore', newFornitori);

      // Update local state
      setDropdownValues(prev => ({
        ...prev,
        fornitori: newFornitori,
      }));

      // Reload data
      await loadData();
      showNotification('Fornitori aggiornati con successo', 'success');
    } catch (error) {
      console.error('Failed to update fornitori:', error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento dei fornitori",
        'error'
      );
      throw error;
    }
  };

  const tabs = [
    { key: 'materie-prime' as MainTab, label: 'Materie Prime' },
    { key: 'ricette' as MainTab, label: 'Ricette' },
    { key: 'menu-mix' as MainTab, label: 'Menu Mix' },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
          >
            Ricarica
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Menu Engineering
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">
          Gestisci materie prime, ricette e analizza il tuo menu con la matrice
          BCG
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-t-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'materie-prime' && (
        <MateriePrime
          rawMaterials={rawMaterials}
          onAdd={handleAddRawMaterialWithNotification}
          onUpdate={handleUpdateRawMaterialWithNotification}
          onDelete={handleDeleteRawMaterialWithNotification}
          onManageTipologia={() => setShowTipologiaModal(true)}
          onManageCategoria={() => setShowCategoriaModal(true)}
          onManageMateriaPrima={() => setShowMateriaPrimaModal(true)}
          onManageFornitore={() => setShowFornitoreModal(true)}
          tipologie={tipologie}
          categorie={categorie}
          materiePrime={materiePrime}
          fornitori={fornitori}
        />
      )}

      {activeTab === 'ricette' && (
        <Ricette
          recipes={recipes}
          rawMaterials={rawMaterials}
          onAdd={handleAddRecipeWithNotification}
          onUpdate={handleUpdateRecipeWithNotification}
          onDelete={handleDeleteRecipeWithNotification}
          onReorder={handleReorderRecipes}
        />
      )}

      {activeTab === 'menu-mix' && (
        <MenuMix
          recipes={recipes}
          recipeSales={recipeSales}
          onRecipeClick={recipe => {
            console.log('Recipe clicked:', recipe);
            // Navigate to recipe edit or show details
          }}
        />
      )}

      {/* Modals */}
      {showTipologiaModal && (
        <ManageListModal
          title="Gestisci Tipologie"
          items={tipologie}
          onClose={() => setShowTipologiaModal(false)}
          onSave={handleManageTipologia}
        />
      )}

      {showCategoriaModal && (
        <ManageListModal
          title="Gestisci Categorie"
          items={categorie}
          onClose={() => setShowCategoriaModal(false)}
          onSave={handleManageCategoria}
        />
      )}

      {showMateriaPrimaModal && (
        <ManageListModal
          title="Gestisci Materie Prime"
          items={materiePrime}
          onClose={() => setShowMateriaPrimaModal(false)}
          onSave={handleManageMateriaPrima}
        />
      )}

      {showFornitoreModal && (
        <ManageListModal
          title="Gestisci Fornitori"
          items={fornitori}
          onClose={() => setShowFornitoreModal(false)}
          onSave={handleManageFornitore}
        />
      )}
    </div>
  );
};

export default MenuEngineering;
