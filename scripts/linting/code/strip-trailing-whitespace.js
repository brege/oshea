#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
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
} = {}) {
  const { minimatch } = require('minimatch');
  let files = new Set();
  for (const file of findFilesArray('.', {
    filter: () => true, // All files, filter by pattern below
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  let changedFiles = [];
  let checkedFiles = [];

  files.forEach(filePath => {
    const relPath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = content.replace(/[ \t]+$/gm, '');
    checkedFiles.push(relPath);
    if (content !== cleaned) {
      if (fix) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        changedFiles.push(relPath);
        if (!quiet && !json) {
          console.log(`Stripped: ${relPath}`);
        }
      } else if (!quiet && !json) {
        console.log(chalk.yellow(`Would strip: ${relPath}`));
      }
    }
  });

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
  }

  process.exitCode = changedFiles.length > 0 ? 1 : 0;
  return summary;
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('stripTrailingWhitespace', lintingConfigPath) || {};
  // Use CLI targets if provided, else config
  const patterns = targets.length ? getPatternsFromArgs(targets) : (config.targets || []);
  const ignores = config.excludes || getDefaultGlobIgnores();

  runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
  });
}

module.exports = { runLinter };

