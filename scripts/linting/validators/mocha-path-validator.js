#!/usr/bin/env node
// scripts/linting/validators/paths-js-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const paths = require('@paths');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const { loadLintSection, parseCliArgs } = require(lintHelpersPath);

function isIgnored(filePath, ignores) {
  return (ignores || []).some(ignored =>
    filePath === ignored || path.basename(filePath) === ignored
  );
}

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

function runValidator({
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
  fix = false,     // stub
  force = false,   // stub
  config = {}
} = {}) {
  const ignores = config.ignores || [];
  let missingCount = 0;
  const results = [];

  for (const [name, filePath] of walkRegistry(paths)) {
    if (typeof filePath !== 'string') continue;
    if (isIgnored(filePath, ignores)) {
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

  const summary = {
    found: results.filter(r => r.type === 'found').length,
    missing: results.filter(r => r.type === 'missing').length,
    ignored: results.filter(r => r.type === 'ignored').length
  };

  if (json) {
    process.stdout.write(JSON.stringify({ summary, results }, null, 2) + '\n');
  } else if (quiet) {
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

  if (debug && dryRun) {
    console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  process.exitCode = missingCount === 0 ? 0 : 1;
  return { summary, results };
}

// CLI entry
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('validate-paths', lintingConfigPath) || {};
  runValidator({
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
    fix: !!flags.fix,
    force: !!flags.force,
    config
  });
}

module.exports = { runValidator };

