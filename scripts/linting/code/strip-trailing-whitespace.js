#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  loadLintSection,
} = require(lintHelpersPath);

function runLinter({
  patterns = [],
  ignores = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
} = {}) {
  const files = new Set();

  for (const file of findFilesArray('.', {
    filter: () => true,
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  const changedFiles = [];
  const checkedFiles = [];

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const original = fs.readFileSync(filePath, 'utf8');
    const cleaned = original.replace(/[ \t]+$/gm, '');
    checkedFiles.push(relPath);

    if (original !== cleaned) {
      if (fix && !dryRun) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        changedFiles.push(relPath);
        if (!quiet && !json) {
          console.log(`Stripped: ${relPath}`);
        }
      } else if (!quiet && !json) {
        console.log(chalk.yellow(`Would strip: ${relPath}`));
      }
    }
  }

  const summary = {
    checked: checkedFiles,
    changed: changedFiles,
  };

  if (json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', checkedFiles);
    console.log('[DEBUG] Files changed:', changedFiles);
    if (dryRun) {
      console.log('[DEBUG] Dry-run mode enabled — no files were written.');
    }
  }

  process.exitCode = changedFiles.length > 0 ? 1 : 0;
  return summary;
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('remove-ws', lintingConfigPath) || {};

  const patterns = targets.length > 0
    ? getPatternsFromArgs(targets)
    : (config.targets || []);

  const ignores = config.excludes || getDefaultGlobIgnores();

  runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
  });
}

module.exports = { runLinter };

