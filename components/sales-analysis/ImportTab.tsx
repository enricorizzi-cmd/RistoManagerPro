import React, { useState, useEffect, useCallback } from 'react';
import { UploadIcon, CheckCircleIcon } from '../icons/Icons';
import {
  uploadPreview,
  importSalesData,
  getImports,
  deleteImport,
} from '../../services/salesAnalysisApi';
import { useAppContext } from '../../contexts/AppContext';
import type { SalesImport } from '../../services/salesAnalysisApi';
import { formatCurrency } from '../../utils/format';

interface ImportTabProps {
  locationId: string;
}

const ImportTab: React.FC<ImportTabProps> = ({ locationId }) => {
  const { showNotification } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [imports, setImports] = useState<SalesImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);
  const [deletingImportId, setDeletingImportId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xls|xlsx|xlt)$/i)) {
      showNotification(
        'Formato file non supportato. Usa .xls, .xlsx o .xlt',
        'error'
      );
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const previewData = await uploadPreview(locationId, selectedFile);
      setPreview(previewData);
      showNotification('File caricato con successo', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Errore nel caricamento del file',
        'error'
      );
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadImports = useCallback(async () => {
    setLoadingImports(true);
    try {
      const result = await getImports(locationId);
      setImports(result.imports);
    } catch (error) {
      console.error('Failed to load imports:', error);
    } finally {
      setLoadingImports(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadImports();
  }, [locationId, loadImports]);

  const handleImport = async () => {
    if (!file || !preview) return;

    setImporting(true);
    try {
      const result = await importSalesData(
        locationId,
        file,
        periodMonth,
        periodYear,
        false
      );

      showNotification(
        `Import completato: ${result.stats.dishesImported} piatti importati`,
        'success'
      );

      // Reset
      setFile(null);
      setPreview(null);
      // Reload imports list
      await loadImports();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Errore durante l'import",
        'error'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteImport = async (importId: string) => {
    if (
      !window.confirm(
        'Sei sicuro di voler eliminare questo import? Questa azione eliminerà tutti i dati correlati e non può essere annullata.'
      )
    ) {
      return;
    }

    setDeletingImportId(importId);
    try {
      await deleteImport(locationId, importId);
      showNotification('Import eliminato con successo', 'success');
      await loadImports();
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Errore durante l'eliminazione dell'import",
        'error'
      );
    } finally {
      setDeletingImportId(null);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('it-IT', {
      month: 'long',
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Carica File Excel</h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xls,.xlsx,.xlt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={loading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-gray-600 mb-2">
              {file ? file.name : 'Clicca per selezionare un file Excel'}
            </span>
            <span className="text-sm text-gray-500">
              Formati supportati: .xls, .xlsx, .xlt
            </span>
          </label>
        </div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Analisi file in corso...</p>
          </div>
        )}
      </div>

      {/* Period Selection */}
      {preview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Seleziona Periodo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mese
              </label>
              <select
                value={periodMonth}
                onChange={e => setPeriodMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('it-IT', {
                      month: 'long',
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anno
              </label>
              <input
                type="number"
                value={periodYear}
                onChange={e => setPeriodYear(parseInt(e.target.value))}
                min={2020}
                max={2100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Anteprima Import</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Tabella Riepilogativa ({preview.preview.summaryTable.totalRows}{' '}
                categorie)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Categoria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantità
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Valore
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.preview.summaryTable.rows
                      .slice(0, 5)
                      .map((row: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.category}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(row.totalValue)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Tabella Dettaglio ({preview.preview.detailTable.totalRows}{' '}
                piatti)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Piatto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Categoria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantità
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Valore
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.preview.detailTable.rows
                      .slice(0, 10)
                      .map((row: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.dishName}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.category}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(row.totalValue)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation */}
            {preview.validation && (
              <div className="mt-4">
                {preview.validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Errori:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {preview.validation.errors.map(
                        (err: any, idx: number) => (
                          <li key={idx}>{err.message}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {preview.validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Avvisi:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
                      {preview.validation.warnings.map(
                        (warn: any, idx: number) => (
                          <li key={idx}>{warn.message}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {preview.validation.isValid &&
                  preview.validation.errors.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-sm text-green-700">
                          File valido e pronto per l&apos;import
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Import Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleImport}
              disabled={!preview.validation.isValid || importing}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Import in corso...
                </>
              ) : (
                <>
                  <UploadIcon className="w-5 h-5" />
                  Importa Dati
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Existing Imports List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Import Esistenti</h2>
        {loadingImports ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento import...</p>
          </div>
        ) : imports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nessun import trovato
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Periodo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Piatti
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantità
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valore
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data Import
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {imports.map(importItem => (
                  <tr key={importItem.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getMonthName(importItem.period_month)}{' '}
                      {importItem.period_year}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {importItem.file_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {importItem.total_dishes}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {importItem.total_quantity.toLocaleString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(importItem.total_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(importItem.import_date).toLocaleDateString(
                        'it-IT'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteImport(importItem.id)}
                        disabled={deletingImportId === importItem.id}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Elimina import"
                      >
                        {deletingImportId === importItem.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportTab;
