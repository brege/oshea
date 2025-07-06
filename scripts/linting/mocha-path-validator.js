#!/usr/bin/env node
// scripts/linting/mocha-path-validator.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet');

const mocharcPath = path.resolve('.mocharc.js');
if (!fs.existsSync(mocharcPath)) {
  if (!isQuiet) console.error('.mocharc.js not found');
  process.exit(1);
}

const content = fs.readFileSync(mocharcPath, 'utf8');

// Extract patterns like: someKey: 'pattern.js'
const patternRegex = /^\s*[a-zA-Z_]+:\s*'([^']+\.js)'/gm;
const patterns = [];
let match;
while ((match = patternRegex.exec(content)) !== null) {
  patterns.push(match[1]);
}

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
      results.push({ type: 'found-single', pattern });
    } else {
      missingCount++;
      results.push({ type: 'missing', pattern });
    }
  }
});

if (isQuiet) {
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
} else {
  console.log('Validating test paths in .mocharc.js:');
  console.log('-------------------------------------');
  for (const res of results) {
    if (res.type === 'found') {
      console.log(`✓ FOUND (${res.count} files): ${res.pattern}`);
    } else if (res.type === 'found-single') {
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

