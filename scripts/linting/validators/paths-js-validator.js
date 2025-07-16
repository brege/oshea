#!/usr/bin/env node
// scripts/linting/validators/paths-js-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const paths = require('@paths');
const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath,
  projectRoot
} = require('@paths');

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

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

function runValidator(options = {}) {
  const { config = {} } = options;
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
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: 0
  };

  return { summary, results, issues };
}

// CLI entry point for standalone use.
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('validate-paths', lintingConfigPath) || {};

  const { summary, results, issues } = runValidator({ config });

  renderLintOutput({ issues, summary, results, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runValidator };
