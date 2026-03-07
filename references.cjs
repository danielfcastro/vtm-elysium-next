#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────
//   Check command line argument
// ────────────────────────────────────────────────
if (process.argv.length < 3) {
  console.error('Usage: node extract-references.js <folder-path>');
  console.error('Example:');
  console.error('  node extract-references.js ./vampire-disciplines');
  console.error('  node extract-references.js /home/user/vtm-json');
  process.exit(1);
}

const folderPath = path.resolve(process.argv[2]);

if (!fs.existsSync(folderPath)) {
  console.error(`Error: Directory does not exist: ${folderPath}`);
  process.exit(1);
}

if (!fs.statSync(folderPath).isDirectory()) {
  console.error(`Error: Not a directory: ${folderPath}`);
  process.exit(1);
}

// ────────────────────────────────────────────────
//   Collect all unique references
// ────────────────────────────────────────────────
const allReferences = new Set();
let fileCount = 0;
let errorCount = 0;

function extractReferences(obj) {
  if (obj === null || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach(extractReferences);
    return;
  }

  // Found a references array?
  if (obj.references && Array.isArray(obj.references)) {
    obj.references.forEach(ref => {
      if (typeof ref === 'string' && ref.trim() !== '') {
        allReferences.add(ref.trim());
      }
    });
  }

  // Recurse into all own properties
  Object.values(obj).forEach(extractReferences);
}

// ────────────────────────────────────────────────
//   Read all .json files in the folder (non-recursive)
// ────────────────────────────────────────────────
const files = fs.readdirSync(folderPath, { withFileTypes: true });

files.forEach(dirent => {
  if (!dirent.isFile()) return;
  if (!dirent.name.toLowerCase().endsWith('.json')) return;

  const fullPath = path.join(folderPath, dirent.name);

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(content);
    extractReferences(data);
    fileCount++;
    console.log(`Processed: ${dirent.name}`);
  } catch (err) {
    errorCount++;
    console.error(`Error in ${dirent.name}: ${err.message}`);
  }
});

// ────────────────────────────────────────────────
//   Output result
// ────────────────────────────────────────────────
console.log('\n');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Unique references found (${allReferences.size} total)`);
console.log(`  Files processed: ${fileCount}  |  Errors: ${errorCount}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');

if (allReferences.size === 0) {
  console.log('(no references found)');
} else {
  const sortedRefs = [...allReferences].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  sortedRefs.forEach(ref => {
    console.log(ref);
  });

  console.log(`\nTotal unique references: ${sortedRefs.length}`);
}