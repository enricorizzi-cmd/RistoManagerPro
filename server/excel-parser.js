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
function detectHeaderRow(sheet, maxRows = 20) {
  for (let row = 1; row <= Math.min(maxRows, sheet['!rows']?.length || maxRows); row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: { s: { r: row - 1, c: 0 }, e: { r: row - 1, c: 10 } } });
    if (rowData.length === 0) continue;
    
    const firstRow = rowData[0];
    const headers = firstRow.filter(h => h && typeof h === 'string');
    
    // Check if this looks like a header row
    const headerKeywords = ['categoria', 'nome', 'piatto', 'quantità', 'quantita', 'valore', 'prezzo'];
    const hasHeaderKeywords = headers.some(h => 
      headerKeywords.some(kw => h.toLowerCase().includes(kw))
    );
    
    if (hasHeaderKeywords && headers.length >= 3) {
      return row;
    }
  }
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
    range: { s: { r: headerRow - 1, c: 0 }, e: { r: sheet['!rows']?.length || 100, c: 10 } },
    defval: null
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
    if (!category || category.toLowerCase() === 'totale' || category.toLowerCase() === 'total') continue;
    
    const quantity = quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
    const totalValue = valueCol >= 0 ? parseNumericValue(row[valueCol]) : 0;
    
    if (category) {
      categories.push({
        category,
        quantity: Math.max(0, Math.round(quantity)),
        totalValue: Math.max(0, totalValue)
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
  const data = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, 
    range: { s: { r: headerRow - 1, c: 0 }, e: { r: sheet['!rows']?.length || 1000, c: 10 } },
    defval: null
  });
  
  if (data.length === 0) return [];
  
  const headers = data[0].map(h => (h || '').toString().toLowerCase());
  const nameCol = findColumnIndex(headers, ['nome', 'piatto', 'descrizione', 'articolo']);
  const categoryCol = findColumnIndex(headers, ['categoria']);
  const quantityCol = findColumnIndex(headers, ['quantità', 'quantita', 'qty']);
  const valueCol = findColumnIndex(headers, ['valore', 'totale', 'importo']);
  const priceCol = findColumnIndex(headers, ['prezzo', 'unitario']);
  
  if (nameCol === -1) return [];
  
  const dishes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const dishName = (row[nameCol] || '').toString().trim();
    if (!dishName || dishName.toLowerCase() === 'totale' || dishName.toLowerCase() === 'total') continue;
    
    const category = categoryCol >= 0 ? (row[categoryCol] || '').toString().trim() : '';
    const quantity = quantityCol >= 0 ? parseNumericValue(row[quantityCol]) : 0;
    const totalValue = valueCol >= 0 ? parseNumericValue(row[valueCol]) : 0;
    const unitPrice = priceCol >= 0 ? parseNumericValue(row[priceCol]) : (quantity > 0 ? totalValue / quantity : 0);
    
    if (dishName) {
      dishes.push({
        dishName: dishName.trim(),
        category: category.trim(),
        quantity: Math.max(0, Math.round(quantity)),
        totalValue: Math.max(0, totalValue),
        unitPrice: Math.max(0, unitPrice)
      });
    }
  }
  
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
    detailTable: detailTable.length > 0 ? detailTable : []
  };
}

/**
 * Parse Excel file
 */
function parseExcelFile(buffer, fileName) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const tables = detectTables(workbook);
    
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
        detectedFormat: fileName.endsWith('.xlsx') ? 'xlsx' : fileName.endsWith('.xls') ? 'xls' : 'xlt'
      },
      fileHash
    };
  } catch (error) {
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
  if (parseResult.summaryTable.length === 0 && parseResult.detailTable.length === 0) {
    errors.push({
      type: 'no_data',
      message: 'Nessun dato trovato nel file Excel',
      severity: 'error'
    });
  }
  
  // Validate summary table
  parseResult.summaryTable.forEach((row, index) => {
    if (!row.category) {
      warnings.push({
        type: 'missing_category',
        message: `Riga ${index + 1}: categoria mancante`,
        row: index + 1,
        severity: 'warning'
      });
    }
    if (row.quantity < 0) {
      errors.push({
        type: 'negative_quantity',
        message: `Riga ${index + 1}: quantità negativa`,
        row: index + 1,
        severity: 'error'
      });
    }
    if (row.totalValue < 0) {
      errors.push({
        type: 'negative_value',
        message: `Riga ${index + 1}: valore negativo`,
        row: index + 1,
        severity: 'error'
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
        severity: 'warning'
      });
    }
    if (row.quantity < 0) {
      errors.push({
        type: 'negative_quantity',
        message: `Riga ${index + 1}: quantità negativa`,
        row: index + 1,
        severity: 'error'
      });
    }
    if (row.totalValue < 0) {
      errors.push({
        type: 'negative_value',
        message: `Riga ${index + 1}: valore negativo`,
        row: index + 1,
        severity: 'error'
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  parseExcelFile,
  validateParsedData,
  normalizeDishName,
  normalizeCategoryName,
  parseNumericValue
};

