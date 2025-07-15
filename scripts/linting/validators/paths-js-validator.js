#!/usr/bin/env node
// scripts/linting/validators/paths-js-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require('@paths');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const { loadLintSection, parseCliArgs } = require(lintHelpersPath);

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
  fix = false,     // stubbed by policy
  force = false,   // stubbed by policy
  config = {}
} = {}) {
  const ignores = config.ignores || [];
  const issues = [];
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
      results.push({ type: 'missing', name, filePath });
      issues.push({
        file: 'paths.js',
        message: `Entry '${name}' expected file at path: ${filePath}. File not found.`,
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
    if (json) {
      process.stdout.write(JSON.stringify({ summary, results, issues }, null, 2) + '\n');
    } else {
      console.log('Validating entries in @paths:');
      console.log('-------------------------------------');

      for (const res of results) {
        if (res.type === 'found') {
          console.log(chalk.green(`  FOUND   : ${res.name} -> ${res.filePath}`));
        } else if (res.type === 'missing') {
          console.log(chalk.red(`  MISSING : ${res.name} -> ${res.filePath}`));
        } else if (res.type === 'ignored') {
          console.log(chalk.gray(`  IGNORED : ${res.name} -> ${res.filePath}`));
        }
      }

      console.log('-------------------------------------');
      if (summary.missing === 0) {
        console.log(chalk.green('Validation complete. All paths are valid.'));
      } else {
        console.log(chalk.yellow(`Validation complete: ${summary.missing} missing path(s).`));
      }
    }
  }

  if (debug && dryRun) {
    console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  process.exitCode = summary.missing === 0 ? 0 : 1;

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

