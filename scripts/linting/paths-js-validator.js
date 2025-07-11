#!/usr/bin/env node
// scripts/linting/paths-js-validator.js

const fs = require('fs');
const path = require('path');
const paths = require('../../paths.js');

// === Configurable ignore list ===
// You can add absolute paths, relative paths, or just file names.
const IGNORED_PATHS = [
  'config.yaml', // Add more as needed
];

const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet');

let missingCount = 0;
const results = [];

function isIgnored(filePath) {
  // Check if the filePath matches any ignored path or file name
  return IGNORED_PATHS.some(ignored =>
    filePath === ignored ||
    path.basename(filePath) === ignored
  );
}

for (const [name, filePath] of Object.entries(paths)) {
  if (typeof filePath !== 'string') continue;
  if (isIgnored(filePath)) {
    results.push({ type: 'ignored', name, filePath });
    continue;
  }
  if (fs.existsSync(filePath)) {
    results.push({ type: 'found', name, filePath });
  } else {
    missingCount++;
    results.push({ type: 'missing', name, filePath });
  }
}

if (isQuiet) {
  if (missingCount > 0) {
    console.log('Validating paths in paths.js');
    console.log('-------------------------------------');
    for (const res of results) {
      if (res.type === 'missing') {
        console.log(`MISSING: ${res.name} -> ${res.filePath}`);
      }
    }
    console.log('-------------------------------------');
    console.log(`Validation complete: ${missingCount} missing path(s)`);
  }
} else {
  console.log('Validating paths in paths.js');
  console.log('-------------------------------------');
  for (const res of results) {
    if (res.type === 'found') {
      console.log(`FOUND: ${res.name} -> ${res.filePath}`);
    } else if (res.type === 'missing') {
      console.log(`MISSING: ${res.name} -> ${res.filePath}`);
    } else if (res.type === 'ignored') {
      console.log(`IGNORED: ${res.name} -> ${res.filePath}`);
    }
  }
  console.log('-------------------------------------');
  if (missingCount === 0) {
    console.log('Validation complete');
  } else {
    console.log(`Validation complete: ${missingCount} missing path(s)`);
  }
}

process.exit(missingCount === 0 ? 0 : 1);

