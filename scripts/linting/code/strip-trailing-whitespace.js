#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath,
  fileDiscoveryPath,
  projectRoot
} = require('@paths');

const {
  loadLintSection,
  parseCliArgs,
  getPatternsFromArgs,
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(formattersPath);

function runLinter(options = {}) {
  const {
    targets = [],
    ignores = [],
    fix = false,
    dryRun = false,
    debug = false
  } = options;

  const files = findFiles({
    targets: targets,
    ignores: ignores,
    // This linter can act on any file type, so no fileFilter is needed.
    debug: debug
  });

  const issues = [];
  const changedFiles = new Set();

  for (const filePath of files) {
    const relPath = path.relative(projectRoot, filePath);
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
            severity: 1,
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

  const finalTargets = targets.length > 0
    ? getPatternsFromArgs(targets)
    : (config.targets || []);
  const ignores = config.excludes || [];

  const { issues, summary } = runLinter({
    targets: finalTargets,
    ignores,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    debug: !!flags.debug
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
