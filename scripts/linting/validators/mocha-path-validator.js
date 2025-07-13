#!/usr/bin/env node
// scripts/linting/validators/mocha-path-validator.js

require('module-alias/register');

const fs = require('fs');
const glob = require('glob');
const { mocharcPath } = require('@paths');

const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet');
const outputJson = args.includes('--json');
const debug = args.includes('--debug');

// Print the calculated config path
if (debug || (!isQuiet && !outputJson)) {
  console.log(`[DEBUG] Calculated .mocharc.js path: ${mocharcPath}`);
}

if (!fs.existsSync(mocharcPath)) {
  if (!isQuiet && !outputJson) {
    console.error(`.mocharc.js not found at: ${mocharcPath}`);
  }
  if (outputJson) {
    process.stdout.write(JSON.stringify({
      error: `.mocharc.js not found at: ${mocharcPath}`,
      missing: true,
      path: mocharcPath
    }, null, 2) + '\n');
  }
  process.exit(1);
}

// Recursively extract all string patterns ending in .js from any object/array
function* extractJsPatterns(obj) {
  if (typeof obj === 'string' && obj.endsWith('.js')) {
    yield obj;
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      yield* extractJsPatterns(item);
    }
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      yield* extractJsPatterns(value);
    }
  }
}

let config;
try {
  config = require(mocharcPath);
} catch (e) {
  // fallback: try to eval the file (less safe, but covers edge cases)
  const content = fs.readFileSync(mocharcPath, 'utf8');
  try {
    // eslint-disable-next-line no-eval
    config = eval(content.replace(/^module\.exports\s*=\s*/, ''));
  } catch {
    config = {};
  }
}

// Gather all .js patterns from the config
const patterns = Array.from(extractJsPatterns(config));

let missingCount = 0;
const results = [];

patterns.forEach(pattern => {
  if (pattern.includes('*')) {
    const matches = glob.sync(pattern);
    if (matches.length === 0) {
      missingCount++;
      results.push({ type: 'missing', pattern });
    } else {
      results.push({ type: 'found', pattern, count: matches.length });
    }
  } else {
    if (fs.existsSync(pattern)) {
      results.push({ type: 'found', pattern });
    } else {
      missingCount++;
      results.push({ type: 'missing', pattern });
    }
  }
});

if (outputJson) {
  process.stdout.write(JSON.stringify({
    path: mocharcPath,
    summary: {
      found: results.filter(r => r.type === 'found').length,
      missing: results.filter(r => r.type === 'missing').length
    },
    results
  }, null, 2) + '\n');
} else if (isQuiet) {
  // Only output if there are missing patterns
  if (missingCount > 0) {
    console.log('Validating test paths in .mocharc.js:');
    console.log('-------------------------------------');
    for (const res of results) {
      if (res.type === 'missing') {
        console.log(`✗ MISSING: ${res.pattern}`);
      }
    }
    console.log('-------------------------------------');
    console.log(`Validation complete: ${missingCount} missing pattern(s)`);
  }
  // Else: silent pass
} else {
  console.log('Validating test paths in .mocharc.js:');
  console.log('-------------------------------------');
  for (const res of results) {
    if (res.type === 'found' && res.count !== undefined) {
      console.log(`✓ FOUND (${res.count} files): ${res.pattern}`);
    } else if (res.type === 'found') {
      console.log(`✓ FOUND: ${res.pattern}`);
    } else if (res.type === 'missing') {
      console.log(`✗ MISSING: ${res.pattern}`);
    }
  }
  console.log('-------------------------------------');
  if (missingCount === 0) {
    console.log('Validation complete');
  } else {
    console.log(`Validation complete: ${missingCount} missing pattern(s)`);
  }
}

process.exit(missingCount === 0 ? 0 : 1);

