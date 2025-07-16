#!/usr/bin/env node
// scripts/linting/code/logging-lint.js

require('module-alias/register');

const fs = require('fs');
const { lintHelpersPath, lintingConfigPath, formattersPath } = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
} = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

const CONSOLE_REGEX = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
const CHALK_REGEX = /chalk\.(\w+)/g;

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const lines = content.split('\n');
  const hits = [];

  lines.forEach((line, idx) => {
    let match;
    while ((match = CONSOLE_REGEX.exec(line))) {
      hits.push({
        type: 'console',
        method: `console.${match[1]}`,
        line: idx + 1,
        code: line.trim(),
      });
    }
    while ((match = CHALK_REGEX.exec(line))) {
      hits.push({
        type: 'chalk',
        method: `chalk.${match[1]}`,
        line: idx + 1,
        code: line.trim(),
      });
    }
  });

  hits.forEach(hit => {
    const lineContent = lines[hit.line - 1];
    const prevLine = lines[hit.line - 2] || '';
    hit.ignore =
      lineContent.includes('lint-disable-line logging') ||
      prevLine.includes('lint-disable-next-line logging');
  });

  return hits.length ? { file: filePath, hits } : null;
}

function runLinter(options = {}) {
  const {
    targets = [],
    excludes = [],
  } = options;

  const files = new Set();
  const issues = [];

  for (const target of targets) {
    for (const file of findFilesArray(target, {
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
      ignores: [],
    })) {
      files.add(file);
    }
  }

  for (const file of files) {
    if (isExcluded(file, excludes)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const hit of result.hits) {
      if (hit.ignore) continue;

      const severity = hit.type === 'console' ? 2 : 1;

      issues.push({
        file,
        line: hit.line,
        column: 1,
        message: `Disallowed '${hit.method}' call found.`,
        rule: hit.type === 'console' ? 'no-console' : 'no-chalk',
        severity,
        method: hit.method,
        code: hit.code,
      });
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: 0 // This linter doesn't fix anything
  };

  return { issues, summary, results: [] }; // No detailed 'results' for this linter
}

// CLI entry
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const loggingConfig = loadLintSection('logging', lintingConfigPath) || {};
  const configTargets = loggingConfig.targets || [];
  const configExcludes = loggingConfig.excludes || [];

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  const { issues, summary } = runLinter({
    targets: finalTargets,
    excludes,
    config: loggingConfig,
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
