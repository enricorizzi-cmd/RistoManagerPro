import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../src/config/api';

interface Location {
  id: string;
  name: string;
  descrizione?: string | null;
  status: 'active' | 'suspended';
  created_at: string;
}

const Settings: React.FC = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    descrizione: '',
  });
  const [showTabsModal, setShowTabsModal] = useState(false);
  const [selectedLocationForTabs, setSelectedLocationForTabs] =
    useState<Location | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());

  interface TabItem {
    tab_name: string;
    label: string;
    is_enabled: boolean;
    subtabs?: TabItem[];
  }

  const [availableTabs, setAvailableTabs] = useState<TabItem[]>([
    {
      tab_name: 'dashboard',
      label: 'Dashboard',
      is_enabled: true,
    },
    {
      tab_name: 'financial-plan',
      label: 'Piano Finanziario',
      is_enabled: true,
      subtabs: [
        {
          tab_name: 'financial-plan-overview',
          label: 'Panoramica',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-plan',
          label: 'Piano Mensile',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-causali',
          label: 'Causali',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-business-plan',
          label: 'Business Plan',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-stats',
          label: 'Statistiche',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-inserisci-dati',
          label: 'Inserisci Dati',
          is_enabled: true,
        },
        {
          tab_name: 'financial-plan-analisi-fp',
          label: 'Analisi FP',
          is_enabled: true,
        },
      ],
    },
    {
      tab_name: 'menu-engineering',
      label: 'Menu Engineering',
      is_enabled: true,
      subtabs: [
        {
          tab_name: 'menu-engineering-materie-prime',
          label: 'Materie Prime',
          is_enabled: true,
        },
        {
          tab_name: 'menu-engineering-ricette',
          label: 'Ricette',
          is_enabled: true,
        },
        {
          tab_name: 'menu-engineering-menu-mix',
          label: 'Menu Mix',
          is_enabled: true,
        },
      ],
    },
    {
      tab_name: 'sales-analysis',
      label: 'Analisi Vendite',
      is_enabled: true,
      subtabs: [
        {
          tab_name: 'sales-analysis-import',
          label: 'Import Dati',
          is_enabled: true,
        },
        {
          tab_name: 'sales-analysis-links',
          label: 'Gestione Collegamenti',
          is_enabled: true,
        },
        {
          tab_name: 'sales-analysis-dashboard',
          label: 'Dashboard Analisi',
          is_enabled: true,
        },
        {
          tab_name: 'sales-analysis-impostazioni',
          label: 'Impostazioni',
          is_enabled: true,
        },
      ],
    },
    {
      tab_name: 'users',
      label: 'Utenti',
      is_enabled: true,
    },
    {
      tab_name: 'settings',
      label: 'Impostazioni',
      is_enabled: true,
    },
  ]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      } else {
        setError('Errore nel caricamento delle aziende');
      }
    } catch (error) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/locations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          descrizione: '',
        });
        fetchLocations();
      } else {
        setError("Errore nella creazione dell'azienda");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/settings/locations/${editingLocation.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            status: editingLocation.status,
          }),
        }
      );

      if (response.ok) {
        setEditingLocation(null);
        setFormData({
          name: '',
          descrizione: '',
        });
        fetchLocations();
      } else {
        setError("Errore nell'aggiornamento dell'azienda");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const handleStatusToggle = async (
    locationId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    try {
      const location = locations.find(l => l.id === locationId);
      if (!location) return;

      const response = await fetch(
        `${API_BASE_URL}/api/settings/locations/${locationId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: location.name,
            descrizione: location.descrizione || null,
            status: newStatus,
          }),
        }
      );

      if (response.ok) {
        fetchLocations();
      } else {
        setError("Errore nell'aggiornamento dello stato");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const openTabsModal = async (location: Location) => {
    setSelectedLocationForTabs(location);
    setExpandedTabs(new Set()); // Reset expanded tabs

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/settings/locations/${location.id}/tabs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const tabs = await response.json();
        // Flatten tabs array for lookup
        const tabsMap = new Map<string, boolean>();
        tabs.forEach((t: any) => {
          tabsMap.set(t.tab_name, t.is_enabled === 1);
        });

        const updatedTabs = availableTabs.map(tab => {
          const isEnabled = tabsMap.get(tab.tab_name) ?? true;
          const updatedSubtabs = tab.subtabs?.map(subtab => ({
            ...subtab,
            is_enabled: tabsMap.get(subtab.tab_name) ?? true,
          }));

          return {
            ...tab,
            is_enabled: isEnabled,
            subtabs: updatedSubtabs,
          };
        });
        setAvailableTabs(updatedTabs);
      }
    } catch (error) {
      setError('Errore nel caricamento delle tab');
    }

    setShowTabsModal(true);
  };

  const toggleTabExpansion = (tabName: string) => {
    setExpandedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabName)) {
        newSet.delete(tabName);
      } else {
        newSet.add(tabName);
      }
      return newSet;
    });
  };

  const handleMainTabToggle = (tabName: string) => {
    setAvailableTabs(prev =>
      prev.map(tab => {
        if (tab.tab_name === tabName) {
          const newEnabled = !tab.is_enabled;
          // If disabling main tab, disable all subtabs
          const updatedSubtabs = tab.subtabs?.map(subtab => ({
            ...subtab,
            is_enabled: newEnabled ? subtab.is_enabled : false,
          }));
          return {
            ...tab,
            is_enabled: newEnabled,
            subtabs: updatedSubtabs,
          };
        }
        return tab;
      })
    );
  };

  const handleSubtabToggle = (mainTabName: string, subtabName: string) => {
    setAvailableTabs(prev =>
      prev.map(tab => {
        if (tab.tab_name === mainTabName && tab.subtabs) {
          const updatedSubtabs = tab.subtabs.map(subtab =>
            subtab.tab_name === subtabName
              ? { ...subtab, is_enabled: !subtab.is_enabled }
              : subtab
          );
          return {
            ...tab,
            subtabs: updatedSubtabs,
          };
        }
        return tab;
      })
    );
  };

  const saveTabs = async () => {
    if (!selectedLocationForTabs) return;

    try {
      // Flatten tabs structure for API
      const flatTabs: Array<{ tab_name: string; is_enabled: boolean }> = [];
      availableTabs.forEach(tab => {
        flatTabs.push({ tab_name: tab.tab_name, is_enabled: tab.is_enabled });
        tab.subtabs?.forEach(subtab => {
          flatTabs.push({
            tab_name: subtab.tab_name,
            is_enabled: subtab.is_enabled,
          });
        });
      });

      const response = await fetch(
        `${API_BASE_URL}/api/settings/locations/${selectedLocationForTabs.id}/tabs`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tabs: flatTabs }),
        }
      );

      if (response.ok) {
        setShowTabsModal(false);
        setSelectedLocationForTabs(null);
        setExpandedTabs(new Set());
      } else {
        setError('Errore nel salvataggio delle tab');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (
      !confirm(
        'Sei sicuro di voler eliminare questa azienda? Questa azione non può essere annullata.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/settings/locations/${locationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchLocations();
      } else {
        setError("Errore nell'eliminazione dell'azienda");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      descrizione: location.descrizione || '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Caricamento impostazioni...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Impostazioni Aziende
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Nuova Azienda
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {locations.map(location => (
            <li key={location.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {location.name[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {location.name}
                    </div>
                    {location.descrizione && (
                      <div className="text-sm text-gray-500">
                        {location.descrizione}
                      </div>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          location.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {location.status === 'active' ? 'Attiva' : 'Sospesa'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {location.id !== 'all' && (
                    <button
                      onClick={() => openEditModal(location)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Modifica
                    </button>
                  )}
                  <button
                    onClick={() => openTabsModal(location)}
                    className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Gestisci Tab
                  </button>
                  {location.id !== 'all' && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusToggle(location.id, location.status)
                        }
                        className={`inline-flex items-center px-3 py-1 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          location.status === 'active'
                            ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                            : 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                        }`}
                      >
                        {location.status === 'active' ? 'Sospendi' : 'Riattiva'}
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Elimina
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLocation) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLocation ? 'Modifica Azienda' : 'Nuova Azienda'}
              </h3>

              <form
                onSubmit={
                  editingLocation ? handleUpdateLocation : handleCreateLocation
                }
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome Azienda
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descrizione
                    </label>
                    <textarea
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={formData.descrizione}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          descrizione: e.target.value,
                        })
                      }
                      placeholder="Inserisci una descrizione dell'azienda (opzionale)"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingLocation(null);
                      setFormData({
                        name: '',
                        descrizione: '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {editingLocation ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Management Modal */}
      {showTabsModal && selectedLocationForTabs && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 md:top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white m-4">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Gestisci Tab - {selectedLocationForTabs.name}
              </h3>

              <div className="space-y-1 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availableTabs.map(tab => {
                  const hasSubtabs = tab.subtabs && tab.subtabs.length > 0;
                  const isExpanded = expandedTabs.has(tab.tab_name);

                  return (
                    <div key={tab.tab_name} className="space-y-1">
                      {/* Main Tab */}
                      <div className="flex items-center justify-between group hover:bg-gray-50 rounded px-2 py-1">
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            checked={tab.is_enabled}
                            onChange={() => handleMainTabToggle(tab.tab_name)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            {tab.label}
                          </span>
                        </div>
                        {hasSubtabs && (
                          <button
                            type="button"
                            onClick={() => toggleTabExpansion(tab.tab_name)}
                            className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={isExpanded ? 'Collassa' : 'Espandi'}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'transform rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Subtabs */}
                      {hasSubtabs && isExpanded && (
                        <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
                          {tab.subtabs?.map(subtab => (
                            <label
                              key={subtab.tab_name}
                              className="flex items-center hover:bg-gray-50 rounded px-2 py-1 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={subtab.is_enabled && tab.is_enabled}
                                disabled={!tab.is_enabled}
                                onChange={() =>
                                  handleSubtabToggle(
                                    tab.tab_name,
                                    subtab.tab_name
                                  )
                                }
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span
                                className={`ml-2 text-sm text-gray-600 ${
                                  !tab.is_enabled ? 'opacity-50' : ''
                                }`}
                              >
                                {subtab.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowTabsModal(false);
                    setSelectedLocationForTabs(null);
                    setExpandedTabs(new Set());
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Annulla
                </button>
                <button
                  onClick={saveTabs}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
