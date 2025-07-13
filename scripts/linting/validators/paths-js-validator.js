#!/usr/bin/env node
// scripts/linting/validators/paths-js-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const paths = require('@paths');

const IGNORED_PATHS = [
  'config.yaml',
];

const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet');
const outputJson = args.includes('--json');

let missingCount = 0;
const results = [];

/**
 * Recursively walk a registry, yielding [fullKey, value] pairs.
 * Handles nested registries/objects.
 */
function* walkRegistry(obj, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      yield* walkRegistry(v, key);
    } else {
      yield [key, v];
    }
  }
}

function isIgnored(filePath) {
  return IGNORED_PATHS.some(ignored =>
    filePath === ignored ||
    path.basename(filePath) === ignored
  );
}

for (const [name, filePath] of walkRegistry(paths)) {
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

if (outputJson) {
  process.stdout.write(JSON.stringify({
    summary: {
      found: results.filter(r => r.type === 'found').length,
      missing: results.filter(r => r.type === 'missing').length,
      ignored: results.filter(r => r.type === 'ignored').length
    },
    results
  }, null, 2) + '\n');
} else if (isQuiet) {
  if (missingCount > 0) {
    console.log('Validating paths in @paths');
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
  console.log('Validating paths in @paths');
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

