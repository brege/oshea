#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { lintHelpersPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
} = require(lintHelpersPath);

function runLinter({
  patterns = [],
  ignores = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
} = {}) {
  // Find all files matching patterns and ignores
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

  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          checked: checkedFiles,
          changed: changedFiles,
        },
        null,
        2
      ) + '\n'
    );
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', checkedFiles);
    console.log('[DEBUG] Files changed:', changedFiles);
  }

  return { checked: checkedFiles, changed: changedFiles };
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const patterns = getPatternsFromArgs(targets);
  const ignores = getDefaultGlobIgnores();

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

