import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '..', 'logo_light.png');
const publicDir = path.join(__dirname, '..', 'public');

// Assicurati che la cartella public esista
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Dimensioni per ogni icona
const iconSizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

async function generateIcons() {
  try {
    console.log('Generazione icone da:', logoPath);
    
    for (const icon of iconSizes) {
      const outputPath = path.join(publicDir, icon.name);
      await sharp(logoPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Creato: ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    // Crea favicon.ico (32x32)
    const icoPath = path.join(publicDir, 'favicon.ico');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(icoPath);
    console.log(`✓ Creato: favicon.ico (32x32)`);
    
    console.log('\n✅ Tutte le icone sono state create con successo!');
  } catch (error) {
    console.error('Errore durante la generazione delle icone:', error);
    process.exit(1);
  }
}

generateIcons();

