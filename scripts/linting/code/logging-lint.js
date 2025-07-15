#!/usr/bin/env node
// scripts/linting/code/logging-lint.js

require('module-alias/register');

const fs = require('fs');
const chalk = require('chalk');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
} = require(lintHelpersPath);

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

function runLinter({
  targets = [],
  excludes = [],
  fix = false, // logging-lint is informational only
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
  config = {},
} = {}) {
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

  if (!quiet) {
    if (json) {
      process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
    } else {
      if (issues.length > 0) {
        issues.forEach(issue => {
          const color = issue.severity === 2 ? chalk.red : chalk.yellow;
          console.log(color(`  ${issue.file}:${issue.line}:${issue.column}  ${issue.message} (${issue.rule})`));
        });

        console.log(`\nFound ${issues.length} logging issue(s) in ${new Set(issues.map(i => i.file)).size} file(s).`);

        if (fix) {
          console.log('');
          console.log('Note: --fix was passed, but logging-lint does not support automatic fixing. Please review these manually.');
        }
      } else {
        console.log('No disallowed logging statements found.');
      }
    }
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Issues found:', issues.length);
    if (dryRun) {
      console.log('[DEBUG] Dry-run mode enabled — no files were written.');
    }
  }

  process.exitCode = issues.length > 0 ? 1 : 0;

  return { issueCount: issues.length };
}

// CLI entry
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const loggingConfig = loadLintSection('logging', lintingConfigPath) || {};
  const configTargets = loggingConfig.targets || [];
  const configExcludes = loggingConfig.excludes || [];

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  runLinter({
    targets: finalTargets,
    excludes,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
    config: loggingConfig,
  });
}

module.exports = { runLinter };

