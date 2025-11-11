import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import {
  getExclusionWords,
  addExclusionWord,
  deleteExclusionWord,
} from '../../services/salesAnalysisApi';

interface ImpostazioniTabProps {
  locationId: string;
}

interface ExclusionWord {
  id: string;
  exclusion_word: string;
  exclusion_type?: 'dish' | 'category';
  created_at: string;
}

const ImpostazioniTab: React.FC<ImpostazioniTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [exclusionWords, setExclusionWords] = useState<ExclusionWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [exclusionType, setExclusionType] = useState<'dish' | 'category'>('dish');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadExclusionWords = useCallback(async () => {
    setLoading(true);
    try {
      const words = await getExclusionWords(locationId);
      setExclusionWords(words);
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nel caricamento delle parole escluse',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [locationId, showNotification]);

  useEffect(() => {
    loadExclusionWords();
  }, [loadExclusionWords]);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) {
      showNotification('Inserisci una parola da escludere', 'error');
      return;
    }

    const wordToAdd = newWord.trim().toLowerCase();

    // Check if word already exists (with same type)
    if (
      exclusionWords.some(
        w => 
          w.exclusion_word.toLowerCase() === wordToAdd && 
          (w.exclusion_type || 'dish') === exclusionType
      )
    ) {
      showNotification('Questa parola è già presente nella lista per questo tipo', 'error');
      return;
    }

    setAdding(true);
    try {
      const added = await addExclusionWord(locationId, wordToAdd, exclusionType);
      setExclusionWords([...exclusionWords, added]);
      setNewWord('');
      showNotification('Parola aggiunta con successo', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nell&apos;aggiunta della parola',
        'error'
      );
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questa parola dalla lista?')) {
      return;
    }

    try {
      await deleteExclusionWord(locationId, id);
      setExclusionWords(exclusionWords.filter(w => w.id !== id));
      showNotification('Parola rimossa con successo', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nella rimozione della parola',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Impostazioni Import</h2>
        <p className="mt-1 text-sm text-gray-600">
          Gestisci le parole da escludere durante l&apos;import dei dati. Puoi
          escludere piatti per nome o per categoria.
        </p>
      </div>

      {/* Add New Word Form */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Aggiungi Parola da Escludere
        </h3>
        <form onSubmit={handleAddWord} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="Es: sospeso, lavoro, test..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !newWord.trim()}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {adding ? 'Aggiunta...' : 'Aggiungi'}
            </button>
          </div>
          
          {/* Exclusion Type Selector */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exclusionType"
                value="dish"
                checked={exclusionType === 'dish'}
                onChange={e => setExclusionType(e.target.value as 'dish' | 'category')}
                className="w-4 h-4 text-primary focus:ring-primary"
                disabled={adding}
              />
              <span className="text-sm font-medium text-gray-700">
                Escludi per Nome Piatto
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exclusionType"
                value="category"
                checked={exclusionType === 'category'}
                onChange={e => setExclusionType(e.target.value as 'dish' | 'category')}
                className="w-4 h-4 text-primary focus:ring-primary"
                disabled={adding}
              />
              <span className="text-sm font-medium text-gray-700">
                Escludi per Categoria
              </span>
            </label>
          </div>
          
          <p className="text-xs text-gray-500">
            La ricerca è case-insensitive (non distingue maiuscole/minuscole)
          </p>
        </form>
      </div>

      {/* Exclusion Words List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Parole Escluse ({exclusionWords.length})
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Elenco delle parole che causano l&apos;esclusione dei piatti
            dall&apos;import
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Caricamento...</div>
        ) : exclusionWords.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>Nessuna parola esclusa. Aggiungi una parola per iniziare.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exclusionWords.map(word => {
              const type = word.exclusion_type || 'dish';
              return (
                <div
                  key={word.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {word.exclusion_word}
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        type === 'category' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {type === 'category' ? 'Categoria' : 'Piatto'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Aggiunta il{' '}
                      {new Date(word.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteWord(word.id)}
                    className="ml-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                  >
                    Rimuovi
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Come funziona l&apos;esclusione
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Puoi escludere piatti in due modi:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>
                  <strong>Per Nome Piatto:</strong> Se un piatto contiene una delle parole nella lista (anche come parte di una parola più lunga), verrà escluso dall&apos;import.
                </li>
                <li>
                  <strong>Per Categoria:</strong> Se la categoria di un piatto contiene una delle parole nella lista, verrà escluso dall&apos;import.
                </li>
              </ul>
              <p className="mt-2">
                <strong>Esempi:</strong>
              </p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>
                  Se aggiungi &quot;sospes&quot; (tipo: Piatto), verranno esclusi piatti come &quot;Piatto SOSPESO&quot;, &quot;Sospes temporaneo&quot;, ecc.
                </li>
                <li>
                  Se aggiungi &quot;lavoro&quot; (tipo: Categoria), verranno esclusi tutti i piatti della categoria &quot;Pranzo di lavoro&quot;, &quot;Lavoro&quot;, ecc.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpostazioniTab;
