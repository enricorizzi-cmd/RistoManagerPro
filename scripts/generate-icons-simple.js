import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script semplice per copiare il logo con nomi diversi
// Le immagini verranno ridimensionate manualmente o con uno strumento esterno

const logoPath = 'logo_light.png';
const publicDir = 'public';

// Assicurati che la cartella public esista
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copia il logo con nomi diversi
// Nota: questi file avranno le stesse dimensioni del logo originale
// Dovranno essere ridimensionati manualmente o con uno strumento esterno

const filesToCreate = [
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'icon-192x192.png',
  'icon-512x512.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
];

if (fs.existsSync(logoPath)) {
  filesToCreate.forEach(file => {
    const destPath = path.join(publicDir, file);
    fs.copyFileSync(logoPath, destPath);
    console.log(`Creato: ${destPath}`);
  });
  
  // Crea anche favicon.ico (copia del PNG per ora)
  fs.copyFileSync(logoPath, path.join(publicDir, 'favicon.ico'));
  console.log('Creato: public/favicon.ico');
  
  console.log('\nTutti i file sono stati creati!');
  console.log('NOTA: Le immagini hanno le stesse dimensioni del logo originale.');
  console.log('Dovranno essere ridimensionate alle dimensioni corrette.');
} else {
  console.error(`Errore: ${logoPath} non trovato!`);
  process.exit(1);
}

