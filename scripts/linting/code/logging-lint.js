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

// Regexes for logging patterns
const CONSOLE_REGEX = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
const CHALK_REGEX = /chalk\.(\w+)/g;

// Scan a file for logging callsites and return detailed hits.
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
        method: match[1],
        line: idx + 1,
        code: line.trim(),
      });
    }
  });

  // Mark hits to ignore based on inline comments
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
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  config = {},
} = {}) {
  const files = new Set();

  // Gather files
  for (const target of targets) {
    for (const file of findFilesArray(target, {
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
      ignores: [],
    })) {
      files.add(file);
    }
  }

  const allHits = [];

  for (const file of files) {
    if (isExcluded(file, excludes)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const hit of result.hits) {
      if (hit.ignore) continue;

      allHits.push({
        type: hit.type,
        method: hit.method,
        file,
        line: hit.line,
        code: hit.code
      });

      if (!json && !quiet) {
        if (hit.type === 'console') {
          if (hit.method === 'console.log') {
            console.warn(
              chalk.yellow(`[lint:console] ${file}:${hit.line}  ${hit.code}`)
            );
            if (fix) {
              console.warn(
                chalk.red('[lint:console]'),
                'Auto-fix is not implemented for logging-lint. Please review and fix manually.'
              );
            }
          } else {
            console.warn(
              chalk.yellow(`[lint:console] ${file}:${hit.line}  ${hit.code}`)
            );
          }
        } else if (hit.type === 'chalk') {
          console.warn(
            chalk.cyan(`[lint:chalk] ${file}:${hit.line}  ${hit.code}`)
          );
        }
      }
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({
      hits: allHits,
      summary: { count: allHits.length }
    }, null, 2) + '\n');
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Hits found:', allHits.length);
  }

  if (allHits.length > 0) {
    process.exitCode = 1;
  }

  return allHits;
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const loggingConfig = loadLintSection('logging', lintingConfigPath) || {};
  const configTargets = loggingConfig.targets || [];
  const configExcludes = loggingConfig.excludes || [];

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  if (flags.debug) {
    console.log('[DEBUG] Targets:', finalTargets);
    console.log('[DEBUG] Excludes:', excludes);
    console.log('[DEBUG] Flags:', flags);
  }

  runLinter({
    targets: finalTargets,
    excludes,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    config: loggingConfig,
  });
}

module.exports = { runLinter };

