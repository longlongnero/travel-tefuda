const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  'index.html',
  'app.js',
  'style.css',
  'assets/journal-logo.png',
  'assets/lake.jpg',
  'assets/mountain.jpg',
];

for (const relative of files) {
  const target = path.join(root, 'dist', relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, relative), target);
}

console.log(`Synced ${files.length} deployable files to dist.`);
