// Excel Parser for Sales Analysis
// Parses Excel files exported from billing management system

const XLSX = require('xlsx');
const crypto = require('crypto');

/**
 * Normalize dish name for matching
 */
function normalizeDishName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Normalize category name
 */
function normalizeCategoryName(name) {
  return normalizeDishName(name);
}

/**
 * Parse numeric value from Excel cell
 */
function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, thousand separators, replace decimal comma
    const cleaned = value
      .replace(/[€\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Detect header row in sheet
 */
function detectHeaderRow(sheet, maxRows = 30) {
  const sheetRange = sheet['!ref']
    ? XLSX.utils.decode_range(sheet['!ref'])
    : null;
  const maxSheetRows = sheetRange ? sheetRange.e.r + 1 : maxRows;
  const actualMaxRows = Math.min(maxRows, maxSheetRows);

  for (let row = 0; row < actualMaxRows; row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: { s: { r: row, c: 0 }, e: { r: row, c: 20 } },
      defval: null,
    });
    if (rowData.length === 0) continue;

    const firstRow = rowData[0];
    if (!firstRow || firstRow.length === 0) continue;

    const headers = firstRow
      .map(h => {
        if (h === null || h === undefined) return '';
        return String(h).trim();
      })
      .filter(h => h && h.length > 0);

    // Check if this looks like a header row
    const headerKeywords = [
      'categoria',
      'nome',
      'piatto',
      'descrizione',
      'articolo',
      'quantità',
      'quantita',
      'qty',
      'valore',
      'totale',
      'importo',
      'prezzo',
      'unitario',
    ];
    const hasHeaderKeywords = headers.some(h =>
      headerKeywords.some(kw => h.toLowerCase().includes(kw.toLowerCase()))
    );

    if (hasHeaderKeywords && headers.length >= 2) {
      console.log(
        `[EXCEL PARSER] Found header row at index ${row + 1}, headers:`,
        headers
      );
      return row + 1; // Return 1-based index
    }
  }
  console.log(`[EXCEL PARSER] No header row found, defaulting to row 1`);
  return 1; // Default to first row
}

/**
 * Find column index by keywords
 */
function findColumnIndex(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').toLowerCase();
    if (keywords.some(kw => header.includes(kw))) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse summary table (categories)
 */
function parseSummaryTable(sheet) {
  const headerRow = detectHeaderRow(sheet);
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: {
      s: { r: headerRow - 1, c: 0 },
      e: { r: sheet['!rows']?.length || 100, c: 10 },
    },
    defval: null,
  });

  if (data.length === 0) return [];

  const headers = data[0].map(h => (h || '').toString().toLowerCase());
  const categoryCol = findColumnIndex(headers, ['categoria']);
  const quantityCol = findColumnIndex(headers, ['quantità', 'quantita', 'qty']);
  const valueCol = findColumnIndex(headers, ['valore', 'totale', 'importo']);

  if (categoryCol === -1) return [];

  const categories = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const category = (row[categoryCol] || '').toString().trim();
    if (
      !category ||
      category.toLowerCase() === 'totale' ||
      category.toLowerCase() === 'total'
    )
      continue;

    const quantity = quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
    const totalValue = valueCol >= 0 ? parseNumericValue(row[valueCol]) : 0;

    if (category) {
      categories.push({
        category,
        quantity: Math.max(0, Math.round(quantity)),
        totalValue: Math.max(0, totalValue),
      });
    }
  }

  return categories;
}

/**
 * Parse detail table (dishes)
 */
function parseDetailTable(sheet) {
  const headerRow = detectHeaderRow(sheet);
  const sheetRange = sheet['!ref']
    ? XLSX.utils.decode_range(sheet['!ref'])
    : null;
  const maxRows = sheetRange ? sheetRange.e.r + 1 : 1000;

  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: {
      s: { r: headerRow - 1, c: 0 },
      e: { r: maxRows - 1, c: 20 },
    },
    defval: null,
    raw: false, // Convert numbers to strings for easier parsing
  });

  if (data.length === 0) {
    console.log('[EXCEL PARSER] No data rows found in detail table');
    return [];
  }

  const headers = data[0].map(h => {
    if (h === null || h === undefined) return '';
    return String(h).trim().toLowerCase();
  });

  console.log('[EXCEL PARSER] Detail table headers:', headers);

  const nameCol = findColumnIndex(headers, [
    'nome',
    'piatto',
    'descrizione',
    'articolo',
    'prodotto',
  ]);
  const categoryCol = findColumnIndex(headers, ['categoria', 'cat']);
  const quantityCol = findColumnIndex(headers, [
    'quantità',
    'quantita',
    'qty',
    'qtà',
    'q.ta',
  ]);
  const valueCol = findColumnIndex(headers, [
    'valore',
    'totale',
    'importo',
    'ammontare',
  ]);
  const priceCol = findColumnIndex(headers, ['prezzo', 'unitario', 'p.unit']);

  console.log(
    `[EXCEL PARSER] Column indices - name: ${nameCol}, category: ${categoryCol}, quantity: ${quantityCol}, value: ${valueCol}, price: ${priceCol}`
  );

  if (nameCol === -1) {
    console.log(
      '[EXCEL PARSER] No name column found, trying to use first non-empty column'
    );
    // Try to use first column as name if no name column found
    for (let i = 0; i < headers.length; i++) {
      if (
        headers[i] &&
        headers[i].length > 0 &&
        !headers[i].match(/^(totale|total|sum|somma)$/i)
      ) {
        console.log(
          `[EXCEL PARSER] Using column ${i} (${headers[i]}) as name column`
        );
        // Temporarily set nameCol to first non-empty column
        const tempNameCol = i;
        const dishes = [];
        for (let j = 1; j < data.length; j++) {
          const row = data[j];
          if (!row || row.length === 0) continue;

          const dishName = (row[tempNameCol] || '').toString().trim();
          if (
            !dishName ||
            dishName.toLowerCase() === 'totale' ||
            dishName.toLowerCase() === 'total' ||
            dishName.match(/^[\d\s]+$/) // Skip rows that are only numbers/spaces
          )
            continue;

          const category =
            categoryCol >= 0 ? (row[categoryCol] || '').toString().trim() : '';
          const quantity =
            quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
          const totalValue =
            valueCol >= 0 ? parseNumericValue(row[valueCol]) : 0;
          const unitPrice =
            priceCol >= 0
              ? parseNumericValue(row[priceCol])
              : quantity > 0
                ? totalValue / quantity
                : 0;

          if (dishName && dishName.length > 0) {
            dishes.push({
              dishName: dishName.trim(),
              category: category.trim(),
              quantity: Math.max(0, Math.round(quantity)),
              totalValue: Math.max(0, totalValue),
              unitPrice: Math.max(0, unitPrice),
            });
          }
        }
        return dishes;
      }
    }
    console.log(
      '[EXCEL PARSER] Could not find any usable column for dish names'
    );
    return [];
  }

  const dishes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const dishName = (row[nameCol] || '').toString().trim();
    if (
      !dishName ||
      dishName.toLowerCase() === 'totale' ||
      dishName.toLowerCase() === 'total' ||
      dishName.match(/^[\d\s]+$/) // Skip rows that are only numbers/spaces
    )
      continue;

    const category =
      categoryCol >= 0 ? (row[categoryCol] || '').toString().trim() : '';
    const quantity = quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
    const totalValue = valueCol >= 0 ? parseNumericValue(row[valueCol]) : 0;
    const unitPrice =
      priceCol >= 0
        ? parseNumericValue(row[priceCol])
        : quantity > 0
          ? totalValue / quantity
          : 0;

    if (dishName && dishName.length > 0) {
      dishes.push({
        dishName: dishName.trim(),
        category: category.trim(),
        quantity: Math.max(0, Math.round(quantity)),
        totalValue: Math.max(0, totalValue),
        unitPrice: Math.max(0, unitPrice),
      });
    }
  }

  console.log(
    `[EXCEL PARSER] Parsed ${dishes.length} dishes from detail table`
  );
  return dishes;
}

/**
 * Detect tables in workbook
 */
function detectTables(workbook) {
  const summaryTable = [];
  const detailTable = [];

  // Try to find tables in all sheets
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // Try to parse as summary table (fewer rows, category-focused)
    const summary = parseSummaryTable(sheet);
    if (summary.length > 0 && summary.length < 50) {
      summaryTable.push(...summary);
    }

    // Try to parse as detail table (more rows, dish-focused)
    const detail = parseDetailTable(sheet);
    if (detail.length > 0) {
      detailTable.push(...detail);
    }
  }

  // If we found detail table in multiple sheets, use the one with most rows
  if (detailTable.length === 0 && workbook.SheetNames.length > 0) {
    // Try first sheet as detail table
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const detail = parseDetailTable(sheet);
    detailTable.push(...detail);
  }

  return {
    summaryTable: summaryTable.length > 0 ? summaryTable : [],
    detailTable: detailTable.length > 0 ? detailTable : [],
  };
}

/**
 * Parse Excel file
 */
function parseExcelFile(buffer, fileName) {
  try {
    console.log(
      `[EXCEL PARSER] Parsing file: ${fileName}, size: ${buffer.length} bytes`
    );

    // Try different options for .xlt files
    const readOptions = {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    };

    // For .xlt files, try with different options
    if (fileName.toLowerCase().endsWith('.xlt')) {
      readOptions.cellDates = false; // Some .xlt files don't handle dates well
      console.log('[EXCEL PARSER] Using .xlt specific options');
    }

    const workbook = XLSX.read(buffer, readOptions);
    console.log(
      `[EXCEL PARSER] Workbook loaded, sheets: ${workbook.SheetNames.join(', ')}`
    );

    // Log sheet info
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      console.log(
        `[EXCEL PARSER] Sheet ${index + 1} "${sheetName}": ${range.e.r + 1} rows, ${range.e.c + 1} cols`
      );

      // Log first few rows for debugging
      const firstRows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: {
          s: { r: 0, c: 0 },
          e: { r: Math.min(5, range.e.r), c: range.e.c },
        },
      });
      console.log(
        `[EXCEL PARSER] First ${Math.min(6, firstRows.length)} rows of "${sheetName}":`,
        JSON.stringify(firstRows).substring(0, 500)
      );
    });

    const tables = detectTables(workbook);
    console.log(
      `[EXCEL PARSER] Detected ${tables.summaryTable.length} summary rows, ${tables.detailTable.length} detail rows`
    );

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      summaryTable: tables.summaryTable,
      detailTable: tables.detailTable,
      metadata: {
        fileName,
        fileSize: buffer.length,
        lastModified: new Date(),
        sheetNames: workbook.SheetNames,
        detectedFormat: fileName.endsWith('.xlsx')
          ? 'xlsx'
          : fileName.endsWith('.xls')
            ? 'xls'
            : 'xlt',
      },
      fileHash,
    };
  } catch (error) {
    console.error('[EXCEL PARSER] Error parsing file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Validate parsed data
 */
function validateParsedData(parseResult) {
  const errors = [];
  const warnings = [];

  // Check if we have data
  if (
    parseResult.summaryTable.length === 0 &&
    parseResult.detailTable.length === 0
  ) {
    errors.push({
      type: 'no_data',
      message: 'Nessun dato trovato nel file Excel',
      severity: 'error',
    });
  }

  // Validate summary table
  parseResult.summaryTable.forEach((row, index) => {
    if (!row.category) {
      warnings.push({
        type: 'missing_category',
        message: `Riga ${index + 1}: categoria mancante`,
        row: index + 1,
        severity: 'warning',
      });
    }
    if (row.quantity < 0) {
      errors.push({
        type: 'negative_quantity',
        message: `Riga ${index + 1}: quantità negativa`,
        row: index + 1,
        severity: 'error',
      });
    }
    if (row.totalValue < 0) {
      errors.push({
        type: 'negative_value',
        message: `Riga ${index + 1}: valore negativo`,
        row: index + 1,
        severity: 'error',
      });
    }
  });

  // Validate detail table
  parseResult.detailTable.forEach((row, index) => {
    if (!row.dishName || row.dishName.trim() === '') {
      warnings.push({
        type: 'missing_dish_name',
        message: `Riga ${index + 1}: nome piatto mancante`,
        row: index + 1,
        severity: 'warning',
      });
    }
    if (row.quantity < 0) {
      errors.push({
        type: 'negative_quantity',
        message: `Riga ${index + 1}: quantità negativa`,
        row: index + 1,
        severity: 'error',
      });
    }
    if (row.totalValue < 0) {
      errors.push({
        type: 'negative_value',
        message: `Riga ${index + 1}: valore negativo`,
        row: index + 1,
        severity: 'error',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

module.exports = {
  parseExcelFile,
  validateParsedData,
  normalizeDishName,
  normalizeCategoryName,
  parseNumericValue,
};
