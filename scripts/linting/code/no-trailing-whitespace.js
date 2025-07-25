#!/usr/bin/env node
// scripts/linting/code/no-trailing-whitespace.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  fileDiscoveryPath,
  projectRoot,
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const {
  loadLintSection,
  parseCliArgs,
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);

function runLinter(options = {}) {
  const {
    targets = [],
    ignores = [],
    fix = false,
    dryRun = false,
    debug = false,
    filetypes = undefined
  } = options;

  const files = findFiles({
    targets: targets,
    ignores: ignores,
    filetypes,
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
  const config = loadLintSection('no-trailing-whitespace', lintingConfigPath) || {};

  const finalTargets = targets.length > 0
    ? targets
    : (config.targets || []);
  const ignores = config.excludes || [];
  const filetypes = config.filetypes;

  if (!filetypes) {
    logger.warn('No filetypes specified! Using file-discovery safe defaults (common text/code files).', { context: 'WhitespaceValidator' });
  }

  const { issues, summary } = runLinter({
    targets: finalTargets,
    ignores,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    debug: !!flags.debug,
    filetypes
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };

