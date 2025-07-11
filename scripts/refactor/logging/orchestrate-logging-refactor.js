#!/usr/bin/env node
// scripts/refactor/logging/orchestrate-logging-refactor.js

require('module-alias/register');
const { srcRoot } = require('@paths');
const path = require('path');
const { probeLogging } = require('./probe-logging');
const { classifyLogging, suggestLogger } = require('./logging-classifier');
const { replaceLoggingSpecies } = require('./replace-logging-species');
const { injectLoggerImport } = require('./inject-logger-import');
const fs = require('fs');

const args = process.argv.slice(2);
const targetDir = args[0] ? path.resolve(process.cwd(), args[0]) : srcRoot;
const verbose = args.includes('--probe') || args.includes('--verbose') || args.includes('-v');
const write = args.includes('--write');

// === STEP 1: Probe ===
console.log('--- [1/4] Probing for logging callsites ---');
const probeResults = probeLogging(targetDir);

if (verbose) {
  // Pretty-print summary
  const aggregate = {
    console: {},
    chalk: {},
    files: probeResults.length,
  };
  probeResults.forEach(({ console: c, chalk: k }) => {
    for (const method in c) {
      aggregate.console[method] = (aggregate.console[method] || 0) + c[method];
    }
    for (const method in k) {
      aggregate.chalk[method] = (aggregate.chalk[method] || 0) + k[method];
    }
  });
  console.log('\n=== Logging Probe Summary ===');
  console.log('Files scanned:', aggregate.files);
  console.log('Console usage:', aggregate.console);
  console.log('Chalk usage:', aggregate.chalk);

  console.log('\n--- Per-file breakdown ---');
  probeResults
    .filter(r => Object.keys(r.console).length || Object.keys(r.chalk).length)
    .forEach(r => {
      console.log(`\n${r.file}`);
      if (Object.keys(r.console).length) console.log('   console:', r.console);
      if (Object.keys(r.chalk).length)   console.log('   chalk:', r.chalk);
    });
}
fs.writeFileSync('logging-probe-report.json', JSON.stringify(probeResults, null, 2));
console.log('Wrote: logging-probe-report.json');

// === STEP 2: Classify ===
console.log('\n--- [2/4] Classifying logging species ---');
const speciesMap = classifyLogging(probeResults);

console.log('\n=== Logging Species Classifier ===\n');
Object.entries(speciesMap)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([species, { count, examples }]) => {
    console.log(`Species: ${species}`);
    console.log(`  Count: ${count}`);
    console.log(`  Suggested mapping: ${suggestLogger(species)}`);
    examples.forEach(ex =>
      console.log(`    Example: ${ex.file}:${ex.line}  ${ex.code}`)
    );
    console.log('');
  });

const mapping = {};
for (const species in speciesMap) {
  mapping[species] = suggestLogger(species);
}
fs.writeFileSync('logging-species-mapping.json', JSON.stringify(mapping, null, 2));
console.log('Wrote: logging-species-mapping.json');

// === STEP 3: Replace Logging Species ===
// For demo: replace all species using mapping (can be customized)
console.log('\n--- [3/4] Replacing logging species ---');
let filesChanged = new Set();
let totalReplacements = 0;

for (const species in mapping) {
  // Only process species that look like actual logging calls
  // e.g., console.log(...), console.error(chalk.red(...)), etc.
  if (!/^console\.\w+\(.*\)$/.test(species)) {
    // Optionally, you can log what you're skipping for transparency:
    // console.log(`Skipping non-console species: ${species}`);
    continue;
  }
  const loggerMethod = mapping[species];
  const { totalReplaced, filesChanged: changed } = replaceLoggingSpecies(targetDir, {
    species,
    loggerMethod,
    write
  });
  changed.forEach(f => filesChanged.add(f));
  totalReplacements += totalReplaced;
}

if (write) {
  console.log('\n[WRITE MODE]');
  console.log(`Files changed: ${filesChanged.size}`);
  console.log(`Total replacements: ${totalReplacements}`);
  filesChanged.forEach(f => console.log('  ', f));
} else {
  console.log('\n[DRY RUN]');
  console.log(`Files that would change: ${filesChanged.size}`);
  console.log(`Total replacements: ${totalReplacements}`);
  filesChanged.forEach(f => console.log('  ', f));
  console.log('\nAdd --write to perform replacements.');
}

// === STEP 4: Inject Logger Import ===
console.log('\n--- [4/4] Injecting logger import ---');
const changedFilesArr = Array.from(filesChanged);
const { filesChanged: importChanged } = injectLoggerImport(changedFilesArr, write);

if (write) {
  console.log('\n[WRITE MODE]');
  console.log(`Files changed (import): ${importChanged.length}`);
  importChanged.forEach(f => console.log('  ', f));
} else {
  console.log('\n[DRY RUN]');
  console.log(`Files that would change (import): ${importChanged.length}`);
  importChanged.forEach(f => console.log('  ', f));
  console.log('\nAdd --write to perform import injection.');
}

console.log('\n=== Orchestration complete! ===');

