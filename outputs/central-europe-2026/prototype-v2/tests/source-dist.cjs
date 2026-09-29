const assert = require('node:assert/strict');
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
  const source = fs.readFileSync(path.join(root, relative));
  const deployed = fs.readFileSync(path.join(root, 'dist', relative));
  assert.deepEqual(deployed, source, `${relative} differs from dist/${relative}`);
}

console.log('PASS: source and deployable dist files are byte-identical');
