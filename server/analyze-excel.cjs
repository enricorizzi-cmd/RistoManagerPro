const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fileName = path.join(__dirname, '..', 'dati Ipratico.xlt');

if (!fs.existsSync(fileName)) {
  console.error(`File ${fileName} not found!`);
  process.exit(1);
}

console.log(`\n=== ANALISI FILE EXCEL: ${fileName} ===\n`);

const workbook = XLSX.readFile(fileName, { cellDates: false });

console.log(`Fogli trovati: ${workbook.SheetNames.length}`);
console.log(`Nomi fogli: ${workbook.SheetNames.join(', ')}\n`);

workbook.SheetNames.forEach((sheetName, sheetIndex) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FOGLIO ${sheetIndex + 1}: "${sheetName}"`);
  console.log('='.repeat(60));

  const sheet = workbook.Sheets[sheetName];
  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;

  if (!range) {
    console.log('Foglio vuoto o senza range definito');
    return;
  }

  console.log(`\nDimensioni:`);
  console.log(`  Righe: ${range.e.r + 1}`);
  console.log(`  Colonne: ${range.e.c + 1}`);

  // Leggi tutte le righe
  const allRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  console.log(`\nPrime 30 righe del foglio:`);
  console.log('-'.repeat(60));

  for (let i = 0; i < Math.min(30, allRows.length); i++) {
    const row = allRows[i];
    const rowData = Array.isArray(row) ? row : [row];
    console.log(`Riga ${i + 1}:`, JSON.stringify(rowData));
  }

  // Analizza le colonne per trovare pattern
  console.log(`\n\nAnalisi colonne (prime 10 righe):`);
  console.log('-'.repeat(60));

  if (allRows.length > 0) {
    const maxCols = Math.max(
      ...allRows.map(r => (Array.isArray(r) ? r.length : 1))
    );
    console.log(`Numero massimo colonne trovate: ${maxCols}\n`);

    for (let col = 0; col < Math.min(maxCols, 10); col++) {
      const colValues = [];
      for (let row = 0; row < Math.min(10, allRows.length); row++) {
        const rowData = Array.isArray(allRows[row])
          ? allRows[row]
          : [allRows[row]];
        colValues.push(rowData[col] || null);
      }
      console.log(`Colonna ${col + 1}:`, colValues);
    }
  }

  // Cerca righe di intestazione
  console.log(`\n\nRicerca righe di intestazione:`);
  console.log('-'.repeat(60));

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

  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const row = allRows[i];
    const rowData = Array.isArray(row) ? row : [row];
    const rowStrings = rowData
      .map(cell =>
        cell !== null && cell !== undefined
          ? String(cell).toLowerCase().trim()
          : ''
      )
      .filter(s => s.length > 0);

    const hasKeywords = rowStrings.some(s =>
      headerKeywords.some(kw => s.includes(kw))
    );

    if (hasKeywords) {
      console.log(`\nRiga ${i + 1} potrebbe essere intestazione:`);
      console.log(`  Valori:`, rowData);
      console.log(`  Stringhe trovate:`, rowStrings);
    }
  }
});

console.log(`\n\n${'='.repeat(60)}`);
console.log('ANALISI COMPLETATA');
console.log('='.repeat(60));
