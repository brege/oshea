#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath
} = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  loadLintSection,
} = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

function runLinter(options = {}) {
  const {
    patterns = [],
    ignores = [],
    fix = false,
    dryRun = false,
  } = options;

  const files = new Set();
  for (const file of findFilesArray('.', {
    filter: () => true,
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  const issues = [];
  const changedFiles = new Set();

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const original = fs.readFileSync(filePath, 'utf8');
    const cleaned = original.replace(/[ \t]+$/gm, '');

    if (original !== cleaned) {
      const lines = original.split('\n');
      lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) {
          issues.push({
            file: relPath,
            line: index + 1,
            column: line.search(/[ \t]+$/) + 1,
            message: 'Trailing whitespace found.',
            rule: 'no-trailing-whitespace',
            severity: 1, // Warning
          });
        }
      });

      if (fix) {
        if (!dryRun) {
          fs.writeFileSync(filePath, cleaned, 'utf8');
        }
        changedFiles.add(relPath);
      }
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: changedFiles.size
  };

  return { issues, summary };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('remove-ws', lintingConfigPath) || {};

  const patterns = targets.length > 0
    ? getPatternsFromArgs(targets)
    : (config.targets || []);
  const ignores = config.excludes || getDefaultGlobIgnores();

  const { issues, summary } = runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
