import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../src/config/api';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: number;
  created_at: string;
  locationIds: string[];
}

interface Location {
  id: string;
  name: string;
  status: string;
}

const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Errore nel caricamento degli utenti');
      }
    } catch (error) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data.filter((loc: Location) => loc.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, [fetchUsers, fetchLocations]);

  const handleUserStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive }),
        }
      );

      if (response.ok) {
        fetchUsers(); // Refresh users list
      } else {
        setError("Errore nell'aggiornamento dello stato utente");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setSelectedLocations(user.locationIds);
    setShowPermissionsModal(true);
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${selectedUser.id}/permissions`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locationIds: selectedLocations }),
        }
      );

      if (response.ok) {
        setShowPermissionsModal(false);
        fetchUsers(); // Refresh users list
      } else {
        setError('Errore nel salvataggio dei permessi');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Sei sicuro di voler eliminare l'utente "${userName}"? Questa azione non può essere annullata.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchUsers(); // Refresh users list
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore nell'eliminazione dell'utente");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const changeUserRole = async (
    userId: string,
    newRole: 'admin' | 'user',
    userName: string
  ) => {
    const roleText = newRole === 'admin' ? 'amministratore' : 'utente';
    if (!confirm(`Sei sicuro di voler rendere "${userName}" ${roleText}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        fetchUsers(); // Refresh users list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nel cambio ruolo');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const createUser = async () => {
    if (
      !newUser.firstName ||
      !newUser.lastName ||
      !newUser.email ||
      !newUser.password
    ) {
      setError('Tutti i campi sono obbligatori');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
        }),
      });

      if (response.ok) {
        setShowAddUserModal(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'user',
        });
        fetchUsers(); // Refresh users list
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore nella creazione dell'utente");
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Caricamento utenti...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestione Utenti</h2>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Aggiungi Utente
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map(user => (
            <li key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.first_name[0]}
                        {user.last_name[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role === 'admin' ? 'Amministratore' : 'Utente'}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Attivo' : 'Sospeso'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openPermissionsModal(user)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Permessi Aziende
                  </button>
                  <button
                    onClick={() =>
                      changeUserRole(
                        user.id,
                        user.role === 'admin' ? 'user' : 'admin',
                        `${user.first_name} ${user.last_name}`
                      )
                    }
                    className={`inline-flex items-center px-3 py-1 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      user.role === 'admin'
                        ? 'border-orange-300 text-orange-700 bg-white hover:bg-orange-50'
                        : 'border-purple-300 text-purple-700 bg-white hover:bg-purple-50'
                    }`}
                  >
                    {user.role === 'admin' ? 'Rimuovi Admin' : 'Rendi Admin'}
                  </button>
                  <button
                    onClick={() =>
                      handleUserStatusToggle(user.id, !user.is_active)
                    }
                    className={`inline-flex items-center px-3 py-1 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      user.is_active
                        ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                        : 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                    }`}
                  >
                    {user.is_active ? 'Sospendi' : 'Riattiva'}
                  </button>
                  <button
                    onClick={() =>
                      deleteUser(
                        user.id,
                        `${user.first_name} ${user.last_name}`
                      )
                    }
                    className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-40 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative z-10 bg-white rounded-lg shadow-xl p-5 border w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Permessi Aziende - {selectedUser.first_name}{' '}
              {selectedUser.last_name}
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {locations.map(location => (
                <label key={location.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={() => handleLocationToggle(location.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {location.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={savePermissions}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-40 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative z-10 bg-white rounded-lg shadow-xl p-5 border w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Aggiungi Nuovo Utente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={e =>
                    setNewUser({ ...newUser, firstName: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Inserisci nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cognome
                </label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={e =>
                    setNewUser({ ...newUser, lastName: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Inserisci cognome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Inserisci email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Inserisci password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ruolo
                </label>
                <select
                  value={newUser.role}
                  onChange={e =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as 'admin' | 'user',
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="user">Utente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUser({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'user',
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Crea Utente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
