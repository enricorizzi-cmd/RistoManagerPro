import React, { useState } from 'react';
import MateriePrime from './menu-engineering/MateriePrime';
import Ricette from './menu-engineering/Ricette';
import MenuMix from './menu-engineering/MenuMix';
import { useMenuEngineering } from '../hooks/useMenuEngineering';
import { useAppContext } from '../contexts/AppContext';
import type { MainTab } from './menu-engineering/types';

const MenuEngineering: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('materie-prime');
  const { showNotification } = useAppContext();

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
  } = useMenuEngineering();

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Menu Engineering</h1>
        <p className="mt-2 text-gray-600">
          Gestisci materie prime, ricette e analizza il tuo menu con la matrice
          BCG
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-xl text-sm font-medium transition ${
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
          onManageTipologia={() => {
            showNotification(
              'Gestione tipologie - Funzionalità da implementare',
              'info'
            );
          }}
          onManageCategoria={() => {
            showNotification(
              'Gestione categorie - Funzionalità da implementare',
              'info'
            );
          }}
          onManageMateriaPrima={() => {
            showNotification(
              'Gestione materie prime - Funzionalità da implementare',
              'info'
            );
          }}
          onManageFornitore={() => {
            showNotification(
              'Gestione fornitori - Funzionalità da implementare',
              'info'
            );
          }}
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
    </div>
  );
};

export default MenuEngineering;
