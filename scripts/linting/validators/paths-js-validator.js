#!/usr/bin/env node
// scripts/linting/validators/paths-js-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require('@paths');
const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath,
  projectRoot
} = require('@paths');

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const {
  adaptRawIssuesToEslintFormat,
  formatLintResults
} = require(formattersPath);

function isIgnored(filePath, ignores) {
  return (ignores || []).some(ignored =>
    filePath === ignored || path.basename(filePath) === ignored
  );
}

function* walkRegistry(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      yield* walkRegistry(value, fullKey);
    } else {
      yield [fullKey, value];
    }
  }
}

function runValidator({
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
  fix = false,     // policy stub
  force = false,   // policy stub
  config = {}
} = {}) {
  const ignores = config.ignores || [];
  const issues = [];
  const results = [];

  for (const [name, filePath] of walkRegistry(paths)) {
    if (typeof filePath !== 'string') continue;

    const relPath = path.isAbsolute(filePath)
      ? path.relative(projectRoot, filePath)
      : filePath;

    if (isIgnored(filePath, ignores)) {
      results.push({ type: 'ignored', name, filePath: relPath });
      continue;
    }

    if (fs.existsSync(filePath)) {
      results.push({ type: 'found', name, filePath: relPath });
    } else {
      results.push({ type: 'missing', name, filePath: relPath });
      issues.push({
        file: 'paths.js',
        message: `Entry '${name}' expected file at path: ${relPath}. File not found.`,
        rule: 'missing-path-entry',
        severity: 2
      });
    }
  }

  const summary = {
    found: results.filter(r => r.type === 'found').length,
    missing: results.filter(r => r.type === 'missing').length,
    ignored: results.filter(r => r.type === 'ignored').length
  };

  if (!quiet) {
    const formatted = formatLintResults(adaptRawIssuesToEslintFormat(issues));
    if (formatted) {
      console.log(formatted);
    }

    if (issues.length === 0 && !json) {
      console.log('✔ No problems');
      console.log('✔ All path entries in paths.js are valid.');
    }
  }

  if (debug && results.length > 0) {
    console.log('\n[DEBUG] Validated @paths entries:');

    const maxNameLength = Math.max(...results.map(r => r.name.length));
    const padKey = key =>
      key.length > 60 ? key.slice(0, 57) + '...' : key.padEnd(maxNameLength, ' ');

    for (const res of results) {
      const symbol =
        res.type === 'found'
          ? chalk.green('[✓]')
          : res.type === 'missing'
            ? chalk.red('[✗]')
            : chalk.gray('[–]');

      const trail =
        res.type === 'missing'
          ? chalk.gray('→ NOT FOUND')
          : res.type === 'ignored'
            ? chalk.gray('→ IGNORED')
            : '';

      console.log(`  ${symbol} ${padKey(res.name)} → ${res.filePath} ${trail}`);
    }
  }


  if (json) {
    process.stdout.write(JSON.stringify({ summary, results, issues }, null, 2) + '\n');
  }

  if (debug && dryRun) {
    console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  process.exitCode = summary.missing > 0 ? 1 : 0;
  return { summary, results, issues };
}

// CLI entry point
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

