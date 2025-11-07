import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XIcon, PencilIcon } from '../icons/Icons';

interface ManageListModalProps {
  title: string;
  items: string[];
  onClose: () => void;
  onSave: (items: string[]) => Promise<void>;
}

const ManageListModal: React.FC<ManageListModalProps> = ({
  title,
  items,
  onClose,
  onSave,
}) => {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleAdd = () => {
    if (newItem.trim() && !localItems.includes(newItem.trim())) {
      setLocalItems([...localItems, newItem.trim()].sort());
      setNewItem('');
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(localItems[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const updated = [...localItems];
      updated[editingIndex] = editingValue.trim();
      setLocalItems(updated.sort());
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDelete = (index: number) => {
    if (
      window.confirm(
        `Sei sicuro di voler eliminare "${localItems[index]}"? Questa operazione aggiornerà tutte le materie prime che la utilizzano.`
      )
    ) {
      const updated = localItems.filter((_, i) => i !== index);
      setLocalItems(updated);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(localItems);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Errore nel salvataggio. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Add new item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAdd()}
              placeholder="Aggiungi nuovo elemento..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Items list */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {localItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nessun elemento. Aggiungi il primo elemento usando il campo sopra.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {localItems.map((item, index) => (
                  <li
                    key={index}
                    className="p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    {editingIndex === index ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onKeyPress={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800"
                          title="Salva"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                          title="Annulla"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900">
                          {item}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="text-primary hover:text-primary-600"
                            title="Modifica"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="text-red-600 hover:text-red-800"
                            title="Elimina"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageListModal;

