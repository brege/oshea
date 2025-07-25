#!/usr/bin/env node
// scripts/linting/code/no-bad-headers.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  fileDiscoveryPath,
  projectRoot,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);

const {
  loadLintSection,
  parseCliArgs
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

  const issues = [];
  const changedFiles = new Set();

  const files = findFiles({
    targets: targets,
    ignores: ignores,
    filetypes,
    debug: debug
  });

  for (const filePath of files) {
    const relPath = path.relative(projectRoot, filePath);
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let lines = originalContent.split('\n');
    let changed = false;

    const expectedHeader = `// ${relPath}`;
    let headerLineIndex = 0;

    if (lines[0]?.startsWith('#!')) {
      headerLineIndex = 1;
    }

    const currentHeader = lines[headerLineIndex];
    const headerMatch = currentHeader?.match(/^\/\/\s*(.+)$/);
    const actualHeaderPath = headerMatch?.[1]?.trim() ?? '';
    const reportLine = headerLineIndex + 1;

    if (!currentHeader || !currentHeader.startsWith('//')) {
      issues.push({
        file: relPath,
        line: reportLine,
        column: 1,
        message: 'Missing file header comment.',
        rule: 'file-header',
        severity: 1,
      });

      if (fix) {
        lines.splice(headerLineIndex, 0, expectedHeader);
        changed = true;
      }

    } else if (actualHeaderPath !== relPath) {
      issues.push({
        file: relPath,
        line: reportLine,
        column: 1,
        message: `Incorrect header path. Expected: "${relPath}", Found: "${actualHeaderPath}"`,
        rule: 'file-header',
        severity: 1,
      });

      if (fix) {
        lines[headerLineIndex] = expectedHeader;
        changed = true;
      }
    }

    if (changed) {
      if (!dryRun) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      }
      changedFiles.add(relPath);
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: changedFiles.size,
  };

  return { issues, summary };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('no-bad-headers', lintingConfigPath) || {};

  const finalTargets = targets.length > 0 ? targets : (config.targets || []);
  const ignores = config.excludes || [];
  const filetypes = config.filetypes;

  if (!filetypes) {
    logger.warn('No filetypes specified! Using file-discovery safe defaults.', { context: 'HeaderValidator' });
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

