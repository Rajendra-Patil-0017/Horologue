import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const framesDir = path.join(__dirname, '../public/frames');
const manifestPath = path.join(framesDir, 'manifest.json');

try {
  if (!fs.existsSync(framesDir)) {
    console.error(`Frames directory not found: ${framesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(framesDir);
  
  // Find all image files
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext) && file !== 'manifest.json';
  });

  if (imageFiles.length === 0) {
    console.warn(`No image files found in ${framesDir}`);
    fs.writeFileSync(manifestPath, JSON.stringify([]));
    process.exit(0);
  }

  // Detect pattern: prefix, padding, extension
  // e.g. "ezgif-frame-001.jpg"
  // Let's analyze the first file to find the prefix and number padding
  const sampleFile = imageFiles[0];
  const match = sampleFile.match(/^([\w-]+?)(\d+)(\.[\w]+)$/);
  
  if (!match) {
    console.error(`Could not match naming pattern in file: ${sampleFile}`);
    // Fallback to alphabetical sorting if regex doesn't match standard pattern
    imageFiles.sort();
    fs.writeFileSync(manifestPath, JSON.stringify(imageFiles, null, 2));
    console.log(`Generated manifest with ${imageFiles.length} files (fallback sorting).`);
    process.exit(0);
  }

  // We sort numerically by extracting the number part
  imageFiles.sort((a, b) => {
    const matchA = a.match(/^([\w-]+?)(\d+)(\.[\w]+)$/);
    const matchB = b.match(/^([\w-]+?)(\d+)(\.[\w]+)$/);
    if (!matchA || !matchB) return a.localeCompare(b);
    return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
  });

  fs.writeFileSync(manifestPath, JSON.stringify(imageFiles, null, 2));
  console.log(`[Manifest Generator] Successfully generated manifest.json with ${imageFiles.length} frames.`);
} catch (error) {
  console.error('Failed to generate manifest.json:', error);
  process.exit(1);
}
