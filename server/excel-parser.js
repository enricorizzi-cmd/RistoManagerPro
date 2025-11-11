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
 * Handles both Italian format (1.234,56) and international format (1,234.56 or 1234.56)
 */
function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[€\s]/g, '').trim();

    if (!cleaned || cleaned === '') return 0;

    // Count commas and dots to determine format
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    // Determine format based on pattern
    if (commaCount === 1 && dotCount === 0) {
      // Italian format: 1234,56 (comma as decimal separator)
      cleaned = cleaned.replace(',', '.');
    } else if (commaCount === 0 && dotCount === 1) {
      // International format: 1234.56 (dot as decimal separator)
      // Keep as is
    } else if (commaCount === 1 && dotCount >= 1) {
      // Mixed: could be Italian (1.234,56) or international (1,234.56)
      // Check position: if comma comes after last dot, it's Italian format
      const lastDotIndex = cleaned.lastIndexOf('.');
      const commaIndex = cleaned.indexOf(',');
      if (commaIndex > lastDotIndex) {
        // Italian format: 1.234,56 - remove dots (thousands), replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // International format: 1,234.56 - remove commas (thousands), keep dot
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (commaCount === 0 && dotCount > 1) {
      // International format with thousands: 1.234.56 - remove all dots except last
      const lastDotIndex = cleaned.lastIndexOf('.');
      cleaned =
        cleaned.substring(0, lastDotIndex).replace(/\./g, '') +
        cleaned.substring(lastDotIndex);
    } else if (commaCount > 1 && dotCount === 0) {
      // Unlikely but possible: 1,234,56 - treat last comma as decimal
      const lastCommaIndex = cleaned.lastIndexOf(',');
      cleaned =
        cleaned.substring(0, lastCommaIndex).replace(/,/g, '') +
        '.' +
        cleaned.substring(lastCommaIndex + 1);
    } else {
      // Default: remove all separators except last comma or dot
      // Try to preserve the last separator as decimal
      const lastCommaIndex = cleaned.lastIndexOf(',');
      const lastDotIndex = cleaned.lastIndexOf('.');

      if (lastCommaIndex > lastDotIndex) {
        // Last separator is comma - Italian format
        cleaned =
          cleaned.substring(0, lastCommaIndex).replace(/[.,]/g, '') +
          '.' +
          cleaned.substring(lastCommaIndex + 1);
      } else if (lastDotIndex > lastCommaIndex) {
        // Last separator is dot - International format
        cleaned =
          cleaned.substring(0, lastDotIndex).replace(/[.,]/g, '') +
          cleaned.substring(lastDotIndex);
      } else {
        // No separators or only one type - remove all
        cleaned = cleaned.replace(/[.,]/g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      console.warn(
        `[EXCEL PARSER] Failed to parse numeric value: "${value}" -> "${cleaned}"`
      );
      return 0;
    }

    return parsed;
  }
  return 0;
}

/**
 * Detect header row in sheet
 */
function detectHeaderRow(sheet, maxRows = 50) {
  const sheetRange = sheet['!ref']
    ? XLSX.utils.decode_range(sheet['!ref'])
    : null;
  const maxSheetRows = sheetRange ? sheetRange.e.r + 1 : maxRows;
  const actualMaxRows = Math.min(maxRows, maxSheetRows);

  console.log(
    `[EXCEL PARSER] Searching for header row in first ${actualMaxRows} rows`
  );

  for (let row = 0; row < actualMaxRows; row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: { s: { r: row, c: 0 }, e: { r: row, c: 20 } },
      defval: null,
      raw: false,
    });
    if (rowData.length === 0) continue;

    const firstRow = rowData[0];
    if (!firstRow || firstRow.length === 0) continue;

    const headers = firstRow
      .map(h => {
        if (h === null || h === undefined) return '';
        const str = String(h).trim();
        // Normalize encoding issues
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/ã/g, 'à')
          .replace(/Ã/g, 'À');
      })
      .filter(h => h && h.length > 0);

    if (headers.length === 0) continue;

    // Check if this looks like a header row
    const headerKeywords = [
      'categoria',
      'nome',
      'piatto',
      'descrizione',
      'articolo',
      'prodotto',
      'quantità',
      'quantita',
      'qty',
      'qtà',
      'q.ta',
      'quantit', // Handle encoding issue: QuantitÃ
      'valore',
      'totale',
      'importo',
      'prezzo',
      'unitario',
      'ammontare',
    ];

    const hasHeaderKeywords = headers.some(h => {
      const hLower = h.toLowerCase();
      return headerKeywords.some(kw => {
        const kwLower = kw.toLowerCase();
        return hLower.includes(kwLower) || hLower === kwLower;
      });
    });

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
    const header = (headers[i] || '').toLowerCase().trim();
    if (!header) continue;

    // Normalize encoding issues (QuantitÃ -> Quantità)
    // Handle common UTF-8 encoding issues where accented chars are split
    let normalized = header;
    // Fix common encoding issues: Ã -> à, etc.
    normalized = normalized
      .replace(/Ã /g, 'à')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã /g, 'à')
      .replace(/Ã/g, 'à') // Catch-all for Ã
      .replace(/ã/g, 'à')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const found = keywords.some(kw => {
      const kwLower = kw.toLowerCase().trim();
      // Try exact match first
      if (header === kwLower || normalized === kwLower) return true;
      // Try contains match
      if (header.includes(kwLower) || normalized.includes(kwLower)) return true;
      // Try reverse (keyword contains header)
      if (kwLower.includes(header) || kwLower.includes(normalized)) return true;
      return false;
    });

    if (found) {
      console.log(
        `[EXCEL PARSER] Found column "${headers[i]}" at index ${i} for keywords: ${keywords.join(', ')}`
      );
      return i;
    }
  }
  console.log(
    `[EXCEL PARSER] Column not found for keywords: ${keywords.join(', ')}`
  );
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
  const quantityCol = findColumnIndex(headers, [
    'quantità',
    'quantita',
    'qty',
    'quantit', // Handle encoding issue: QuantitÃ
    'quantitã', // Direct encoding issue variant
    'quantitÃ', // Another encoding variant
  ]);
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
  // Check if this is a detail table that starts at a specific row (from detectTables)
  const detailStartRow =
    sheet._detailStartRow !== undefined ? sheet._detailStartRow : null;

  let headerRow = 1;
  let dataStartRow = 0;
  let maxRows = null; // No limit - read all rows

  if (detailStartRow !== null) {
    // This is a detail table that starts at a specific row in the original sheet
    // We need to read from that row, treating it as row 0 in our parsing
    console.log(
      `[EXCEL PARSER] Detail table starts at original row ${detailStartRow + 1}, treating as header row`
    );
    headerRow = detailStartRow; // Use the original row index
    dataStartRow = detailStartRow; // Start reading from this row
    const sheetRange = sheet['!ref']
      ? XLSX.utils.decode_range(sheet['!ref'])
      : null;
    // Read all rows from dataStartRow to the end of the sheet
    maxRows = sheetRange ? sheetRange.e.r + 1 : null;
  } else {
    // Normal parsing - detect header row
    headerRow = detectHeaderRow(sheet);
    const sheetRange = sheet['!ref']
      ? XLSX.utils.decode_range(sheet['!ref'])
      : null;
    // Read all rows from headerRow to the end of the sheet
    maxRows = sheetRange ? sheetRange.e.r + 1 : null;
    dataStartRow = headerRow - 1;
  }

  // Build range - if maxRows is null, read to the end
  const range = {
    s: { r: dataStartRow, c: 0 },
    e: maxRows !== null ? { r: maxRows - 1, c: 20 } : undefined, // If maxRows is null, don't set end row
  };

  // Remove undefined properties
  if (range.e === undefined) {
    delete range.e;
  }

  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: range,
    defval: null,
    raw: false, // Convert numbers to strings for easier parsing
  });

  if (data.length === 0) {
    console.log('[EXCEL PARSER] No data rows found in detail table');
    return [];
  }

  // When detailStartRow is set, first row of data is the header
  // Otherwise, detectHeaderRow should have found it
  const headerRowIndex = detailStartRow !== null ? 0 : 0; // Always use first row as header
  const headers = data[headerRowIndex].map(h => {
    if (h === null || h === undefined) return '';
    return String(h).trim().toLowerCase();
  });

  console.log('[EXCEL PARSER] Detail table headers:', headers);
  console.log('[EXCEL PARSER] Total data rows:', data.length);

  const nameCol = findColumnIndex(headers, [
    'prodotto', // Most common in Italian systems
    'nome',
    'piatto',
    'descrizione',
    'articolo',
  ]);
  const categoryCol = findColumnIndex(headers, ['categoria', 'cat']);
  const quantityCol = findColumnIndex(headers, [
    'quantità',
    'quantita',
    'qty',
    'qtà',
    'q.ta',
    'quantit', // Handle encoding issue: QuantitÃ
    'quantitã', // Direct encoding issue variant
    'quantitÃ', // Another encoding variant
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
      '[EXCEL PARSER] No name column found (Prodotto/Nome/Piatto), this might be a summary table, not a detail table'
    );
    console.log('[EXCEL PARSER] Available headers:', headers);

    // CRITICAL: If we don't have a "Prodotto" column, this is likely a SUMMARY table, not a detail table
    // Don't try to parse it as dishes - return empty array
    if (
      headers.includes('categoria') &&
      !headers.some(
        h =>
          h.includes('prodotto') ||
          h.includes('nome') ||
          h.includes('piatto') ||
          h.includes('articolo')
      )
    ) {
      console.log(
        '[EXCEL PARSER] This appears to be a summary table (has Categoria but no Prodotto), skipping detail parsing'
      );
      return [];
    }

    // Try to use first column as name if no name column found, but only if it's not "categoria"
    for (let i = 0; i < headers.length; i++) {
      if (
        headers[i] &&
        headers[i].length > 0 &&
        !headers[i].match(/^(totale|total|sum|somma|categoria)$/i) &&
        headers[i] !== 'categoria'
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
            dishName.toLowerCase() === 'categoria' ||
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
        console.log(
          `[EXCEL PARSER] Parsed ${dishes.length} dishes using fallback method`
        );
        return { dishes, coperti: 0 }; // Fallback: nessun coperto rilevato
      }
    }
    console.log(
      '[EXCEL PARSER] Could not find any usable column for dish names'
    );
    console.log('[EXCEL PARSER] Headers found:', headers);
    return { dishes: [], coperti: 0 };
  }

  const dishes = [];
  let coperti = 0; // Rileva e somma coperti separatamente

  // Helper function per rilevare "Coperto"
  const isCoperto = name => {
    if (!name || typeof name !== 'string') return false;
    const normalized = normalizeDishName(name);
    const lower = name.toLowerCase().trim();
    return (
      normalized === 'coperto' ||
      lower === 'coperto' ||
      lower === 'coperti' ||
      lower.includes('coperto singolo') ||
      lower.includes('coperto doppio') ||
      lower.includes('coperto tavolo') ||
      lower.startsWith('coperto ')
    );
  };

  // Start from row 1 if we have a header row, otherwise from row 0
  const dataStartIndex = detailStartRow !== null ? 1 : 1; // Skip header row
  for (let i = dataStartIndex; i < data.length; i++) {
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

    // Rileva "Coperto" e somma la quantità come coperti (non come piatto)
    if (isCoperto(dishName)) {
      const quantity =
        quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
      coperti += Math.max(0, Math.round(quantity));
      console.log(
        `[EXCEL PARSER] Rilevato "Coperto": ${dishName}, quantità: ${quantity}, coperti totali: ${coperti}`
      );
      continue; // NON aggiungere a dishes
    }

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
    `[EXCEL PARSER] Parsed ${dishes.length} dishes from detail table, coperti: ${coperti}`
  );
  return { dishes, coperti };
}

/**
 * Detect if sheet has two separate tables (summary + detail)
 * Returns the row index where detail table starts, or -1 if not found
 */
function findDetailTableStart(sheet) {
  const sheetRange = sheet['!ref']
    ? XLSX.utils.decode_range(sheet['!ref'])
    : null;
  if (!sheetRange) return -1;

  const maxRows = Math.min(sheetRange.e.r + 1, 1000); // Search more rows

  console.log(
    `[EXCEL PARSER] Searching for detail table start in first ${maxRows} rows`
  );

  // Strategy: Scan all rows looking for header patterns
  // Summary table: "Categoria", "Quantità", "Totale" (3 columns, no "Prodotto")
  // Detail table: "Categoria", "Prodotto", "Quantità", "Totale" (4+ columns, has "Prodotto")

  let summaryHeaderRow = -1;
  let detailHeaderRow = -1;

  for (let row = 0; row < maxRows; row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: { s: { r: row, c: 0 }, e: { r: row, c: 10 } },
      defval: null,
      raw: false,
    });

    if (rowData.length === 0) continue;
    const firstRow = rowData[0];
    if (!firstRow || firstRow.length === 0) continue;

    // Get all non-null values from the row
    const rowValues = firstRow
      .filter(h => h !== null && h !== undefined && String(h).trim().length > 0)
      .map(h => String(h).trim());

    if (rowValues.length < 2) continue; // Skip rows with less than 2 values

    // Normalize headers for comparison
    const headers = rowValues.map(h => {
      return h
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ã/g, 'à')
        .replace(/Ã/g, 'À')
        .toLowerCase();
    });

    // Check for summary table header pattern: "Categoria", "Quantità", "Totale" (3 columns, no "Prodotto")
    const hasCategoria = headers.some(h => h.includes('categoria'));
    const hasProdotto = headers.some(
      h =>
        h.includes('prodotto') ||
        h.includes('nome') ||
        h.includes('piatto') ||
        h.includes('articolo')
    );
    const hasQuantita = headers.some(
      h => h.includes('quantit') || h.includes('qty') || h.includes('qtà')
    );
    const hasTotale = headers.some(
      h => h.includes('totale') || h.includes('valore') || h.includes('importo')
    );

    // Summary table: has Categoria, Quantità, Totale, but NO Prodotto, and exactly 3 columns
    if (
      hasCategoria &&
      hasQuantita &&
      hasTotale &&
      !hasProdotto &&
      rowValues.length === 3
    ) {
      if (summaryHeaderRow === -1) {
        summaryHeaderRow = row;
        console.log(
          `[EXCEL PARSER] Found summary table header at row ${row + 1}:`,
          rowValues
        );
      }
    }

    // Detail table: has Categoria AND Prodotto, plus Quantità/Totale, and 4+ columns
    if (
      hasCategoria &&
      hasProdotto &&
      (hasQuantita || hasTotale) &&
      rowValues.length >= 4
    ) {
      // Make sure this comes AFTER the summary table
      if (summaryHeaderRow >= 0 && row > summaryHeaderRow) {
        detailHeaderRow = row;
        console.log(
          `[EXCEL PARSER] Found detail table header at row ${row + 1}:`,
          rowValues
        );
        break; // Found it, stop searching
      } else if (summaryHeaderRow === -1) {
        // No summary table found, but we found a detail table header
        detailHeaderRow = row;
        console.log(
          `[EXCEL PARSER] Found detail table header at row ${row + 1} (no summary table):`,
          rowValues
        );
        break;
      }
    }
  }

  // Return the detail table header row (1-based index)
  if (detailHeaderRow >= 0) {
    return detailHeaderRow + 1;
  }

  console.log(
    `[EXCEL PARSER] No separate detail table found, using single table mode`
  );
  return -1;
}

/**
 * Detect tables in workbook
 */
function detectTables(workbook) {
  const summaryTable = [];
  const detailTable = [];
  let totalCoperti = 0; // Initialize coperti counter

  // Try to find tables in all sheets
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // Check if this sheet has two separate tables
    const detailStartRow = findDetailTableStart(sheet);

    if (detailStartRow > 0) {
      // Sheet has two tables: parse them separately
      console.log(
        `[EXCEL PARSER] Sheet "${sheetName}" has two tables, detail starts at row ${detailStartRow}`
      );

      // Parse summary table (rows before detailStartRow)
      const summarySheet = { ...sheet };
      const summaryRange = sheet['!ref']
        ? XLSX.utils.decode_range(sheet['!ref'])
        : null;
      if (summaryRange) {
        // Limit summary range to rows before detail table
        summarySheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: detailStartRow - 2, c: summaryRange.e.c },
        });
        const summary = parseSummaryTable(summarySheet);
        if (summary.length > 0) {
          summaryTable.push(...summary);
          console.log(
            `[EXCEL PARSER] Parsed ${summary.length} summary categories`
          );
        }
      }

      // Parse detail table (rows from detailStartRow onwards)
      // IMPORTANT: Don't modify sheet['!ref'], instead pass the range directly to parseDetailTable
      const detailRange = sheet['!ref']
        ? XLSX.utils.decode_range(sheet['!ref'])
        : null;
      if (detailRange) {
        console.log(
          `[EXCEL PARSER] Parsing detail table from row ${detailStartRow} to ${detailRange.e.r + 1}`
        );
        // Create a new sheet object with modified range for parsing
        const detailSheet = { ...sheet };
        // Store the start row offset for parseDetailTable to use
        detailSheet._detailStartRow = detailStartRow - 1; // 0-based index
        const detailResult = parseDetailTable(detailSheet);
        if (detailResult.dishes && detailResult.dishes.length > 0) {
          detailTable.push(...detailResult.dishes);
          totalCoperti += detailResult.coperti || 0;
          console.log(
            `[EXCEL PARSER] Parsed ${detailResult.dishes.length} detail dishes, coperti: ${detailResult.coperti || 0}`
          );
        } else {
          // Fallback: try parsing the full sheet as detail table
          console.log(
            `[EXCEL PARSER] No dishes found in limited range, trying full sheet as detail table`
          );
          const fullDetailResult = parseDetailTable(sheet);
          if (fullDetailResult.dishes && fullDetailResult.dishes.length > 0) {
            detailTable.push(...fullDetailResult.dishes);
            totalCoperti += fullDetailResult.coperti || 0;
            console.log(
              `[EXCEL PARSER] Parsed ${fullDetailResult.dishes.length} detail dishes from full sheet, coperti: ${fullDetailResult.coperti || 0}`
            );
          }
        }
      }
    } else {
      // Single table: try to parse as both summary and detail
      // BUT: Only parse as summary if it doesn't have a "Prodotto" column
      const testHeaders = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        defval: null,
      });

      if (testHeaders.length > 0) {
        const firstRowHeaders = (testHeaders[0] || []).map(h =>
          (h || '').toString().toLowerCase().trim()
        );
        const hasProdotto = firstRowHeaders.some(
          h =>
            h.includes('prodotto') || h.includes('nome') || h.includes('piatto')
        );
        const hasOnlyCategoria =
          firstRowHeaders.includes('categoria') &&
          !hasProdotto &&
          firstRowHeaders.length <= 3;

        // If it has "Prodotto" column, it's a detail table, not summary
        if (hasProdotto) {
          console.log(
            '[EXCEL PARSER] Single table detected as detail table (has Prodotto column)'
          );
          const detailResult = parseDetailTable(sheet);
          if (detailResult.dishes && detailResult.dishes.length > 0) {
            detailTable.push(...detailResult.dishes);
            totalCoperti += detailResult.coperti || 0;
          }
        } else if (hasOnlyCategoria) {
          // If it only has Categoria (and Quantità, Totale), it's a summary table
          console.log(
            '[EXCEL PARSER] Single table detected as summary table (only Categoria)'
          );
          const summary = parseSummaryTable(sheet);
          if (summary.length > 0) {
            summaryTable.push(...summary);
          }
        } else {
          // Try both, but prefer detail if it has more rows
          const summary = parseSummaryTable(sheet);
          const detailResult = parseDetailTable(sheet);

          // Only use summary if it's clearly a summary (few rows, no prodotto column)
          if (
            summary.length > 0 &&
            summary.length < 50 &&
            (!detailResult.dishes || detailResult.dishes.length === 0)
          ) {
            summaryTable.push(...summary);
          }

          // Prefer detail table if it has data
          if (detailResult.dishes && detailResult.dishes.length > 0) {
            detailTable.push(...detailResult.dishes);
            totalCoperti += detailResult.coperti || 0;
          } else if (summary.length > 0 && summary.length < 50) {
            // Only use summary as fallback if no detail found
            summaryTable.push(...summary);
          }
        }
      }
    }
  }

  // If we found summary but no detail table, try to parse the full sheet as detail
  if (
    summaryTable.length > 0 &&
    detailTable.length === 0 &&
    workbook.SheetNames.length > 0
  ) {
    console.log(
      '[EXCEL PARSER] Found summary but no detail table, trying to parse full sheet as detail'
    );
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Try parsing the full sheet, but skip rows that look like summary
      const detailResult = parseDetailTable(sheet);
      if (detailResult.dishes && detailResult.dishes.length > 0) {
        console.log(
          `[EXCEL PARSER] Found ${detailResult.dishes.length} dishes in full sheet "${sheetName}", coperti: ${detailResult.coperti || 0}`
        );
        detailTable.push(...detailResult.dishes);
        totalCoperti += detailResult.coperti || 0;
        break; // Use first sheet with data
      }
    }
  }

  // Final fallback: if still no detail table, try first sheet as detail table
  if (detailTable.length === 0 && workbook.SheetNames.length > 0) {
    console.log(
      '[EXCEL PARSER] Final fallback: trying first sheet as detail table'
    );
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const detailResult = parseDetailTable(sheet);
    if (detailResult.dishes && detailResult.dishes.length > 0) {
      detailTable.push(...detailResult.dishes);
      totalCoperti += detailResult.coperti || 0;
    }
  }

  return {
    summaryTable: summaryTable.length > 0 ? summaryTable : [],
    detailTable: detailTable.length > 0 ? detailTable : [],
    coperti: totalCoperti,
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
    let readOptions = {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    };

    // For .xlt files, try with different options
    if (fileName.toLowerCase().endsWith('.xlt')) {
      readOptions.cellDates = false; // Some .xlt files don't handle dates well
      readOptions.cellNF = false;
      readOptions.cellStyles = false;
      console.log('[EXCEL PARSER] Using .xlt specific options');
    }

    let workbook;
    try {
      workbook = XLSX.read(buffer, readOptions);
    } catch (firstError) {
      // If first attempt fails for .xlt, try alternative options
      if (fileName.toLowerCase().endsWith('.xlt')) {
        console.log(
          '[EXCEL PARSER] First attempt failed, trying alternative options'
        );
        readOptions = {
          type: 'buffer',
          cellDates: false,
          cellNF: false,
          cellStyles: false,
          sheetStubs: false,
          dense: false,
        };
        try {
          workbook = XLSX.read(buffer, readOptions);
          console.log('[EXCEL PARSER] Alternative options succeeded');
        } catch (secondError) {
          // Last resort: try with minimal options
          console.log(
            '[EXCEL PARSER] Second attempt failed, trying minimal options'
          );
          workbook = XLSX.read(buffer, { type: 'buffer' });
          console.log('[EXCEL PARSER] Minimal options succeeded');
        }
      } else {
        throw firstError;
      }
    }
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

    // If no data found, try to parse all sheets more aggressively
    if (tables.summaryTable.length === 0 && tables.detailTable.length === 0) {
      console.log(
        '[EXCEL PARSER] No data found with standard parsing, trying aggressive parsing'
      );

      // Try to parse first sheet as detail table without summary
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const detailResult = parseDetailTable(firstSheet);
        if (detailResult.dishes && detailResult.dishes.length > 0) {
          console.log(
            `[EXCEL PARSER] Found ${detailResult.dishes.length} dishes in first sheet, coperti: ${detailResult.coperti || 0}`
          );
          tables.detailTable = detailResult.dishes;
          tables.coperti = (tables.coperti || 0) + (detailResult.coperti || 0);
        }
      }
    }

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const result = {
      summaryTable: tables.summaryTable,
      detailTable: tables.detailTable,
      coperti: tables.coperti || 0,
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

    console.log(
      `[EXCEL PARSER] Final result: ${result.summaryTable.length} categories, ${result.detailTable.length} dishes, ${result.coperti} coperti`
    );
    return result;
  } catch (error) {
    console.error('[EXCEL PARSER] Error parsing file:', error);
    console.error('[EXCEL PARSER] Error stack:', error.stack);
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
      message:
        'Nessun dato trovato nel file Excel. Verifica che il file contenga una tabella con colonne: Nome/Piatto, Categoria, Quantità, Valore/Totale. Le intestazioni devono essere nella prima riga o nelle prime righe del foglio.',
      severity: 'error',
    });
  } else if (parseResult.detailTable.length === 0) {
    errors.push({
      type: 'no_detail_data',
      message:
        'Nessun piatto trovato nel file. Verifica che il file contenga una tabella dettaglio con colonne: Nome/Piatto, Quantità, Valore/Totale.',
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
