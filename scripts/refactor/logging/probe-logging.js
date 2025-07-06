// scripts/refactor/logging/probe-logging.js

const path = require('path');
const fs = require('fs');
const { findFiles } = require('../../shared/file-helpers');

// Accept the directory to scan as a CLI argument, default to 'src' if not provided
const targetDir = process.argv[2] || 'src';
const SRC_ROOT = path.resolve(process.cwd(), targetDir);

const CONSOLE_REGEX = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
const CHALK_REGEX = /chalk\.(\w+)/g;

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`Could not read file: ${filePath}`);
    return null;
  }
  const consoleMatches = [...content.matchAll(CONSOLE_REGEX)];
  const chalkMatches = [...content.matchAll(CHALK_REGEX)];

  const consoleStats = {};
  for (const match of consoleMatches) {
    const method = match[1];
    consoleStats[method] = (consoleStats[method] || 0) + 1;
  }

  const chalkStats = {};
  for (const match of chalkMatches) {
    const method = match[1];
    chalkStats[method] = (chalkStats[method] || 0) + 1;
  }

  return {
    file: filePath,
    console: consoleStats,
    chalk: chalkStats,
  };
}

const results = [];
for (const file of findFiles(SRC_ROOT, {
  filter: (name) => name.endsWith('.js') || name.endsWith('.mjs')
})) {
  const result = scanFile(file);
  if (result) results.push(result);
}

const aggregate = {
  console: {},
  chalk: {},
  files: results.length,
};
results.forEach(({ console: c, chalk: k }) => {
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
results
  .filter(r => Object.keys(r.console).length || Object.keys(r.chalk).length)
  .forEach(r => {
    console.log(`\n${r.file}`);
    if (Object.keys(r.console).length) console.log('   console:', r.console);
    if (Object.keys(r.chalk).length)   console.log('   chalk:', r.chalk);
  });

// Optionally, write JSON for further analysis
// fs.writeFileSync('logging-probe-report.json', JSON.stringify(results, null, 2));
