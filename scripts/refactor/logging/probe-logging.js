#!/usr/bin/env node
// scripts/refactor/logging/probe-logging.js

const fs = require('fs');
const path = require('path');
const { findFiles } = require('../../shared/file-helpers');

// Use centralized path management
require('module-alias/register');
const { srcRoot } = require('@paths');

// Regexes for logging patterns
const CONSOLE_REGEX = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
const CHALK_REGEX = /chalk\.(\w+)/g;

/**
 * Scan a file for logging callsites and return detailed hits.
 * @param {string} filePath
 * @returns {object|null}
 */
function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const lines = content.split('\n');
  const hits = [];

  // Per-file stats
  const consoleStats = {};
  const chalkStats = {};

  lines.forEach((line, idx) => {
    let match;
    while ((match = CONSOLE_REGEX.exec(line))) {
      hits.push({
        type: 'console',
        method: `console.${match[1]}`,
        line: idx + 1,
        code: line.trim(),
      });
      consoleStats[match[1]] = (consoleStats[match[1]] || 0) + 1;
    }
    while ((match = CHALK_REGEX.exec(line))) {
      hits.push({
        type: 'chalk',
        method: match[1],
        line: idx + 1,
        code: line.trim(),
      });
      chalkStats[match[1]] = (chalkStats[match[1]] || 0) + 1;
    }
  });

  if (hits.length === 0) return null;
  return {
    file: filePath,
    hits,
    console: consoleStats,
    chalk: chalkStats,
  };
}

/**
 * Probe all JS files under targetDir for logging patterns.
 * @param {string} targetDir
 * @returns {Array} Array of per-file results
 */
function probeLogging(targetDir) {
  const results = [];
  for (const file of findFiles(targetDir, {
    filter: (name) => name.endsWith('.js') || name.endsWith('.mjs')
  })) {
    const result = scanFile(file);
    if (result) results.push(result);
  }
  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetDir = args[0]
    ? path.resolve(process.cwd(), args[0])
    : srcRoot;
  const asJson = args.includes('--json');

  const results = probeLogging(targetDir);

  // Aggregate stats for pretty output
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

  if (asJson) {
    fs.writeFileSync('logging-probe-report.json', JSON.stringify(results, null, 2));
    console.log('Probe complete. Output: logging-probe-report.json');
  } else {
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
    fs.writeFileSync('logging-probe-report.json', JSON.stringify(results, null, 2));
  }
}

module.exports = { probeLogging };

