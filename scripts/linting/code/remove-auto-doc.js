#!/usr/bin/env node
// scripts/linting/code/remove-auto-doc.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { lintHelpersPath, lintingConfigPath, formattersPath } = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
} = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

const BLOCK_COMMENT_REGEX = /\/\*\*[\r\n][\s\S]*?\*\//g;

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const matches = [];
  let match;

  while ((match = BLOCK_COMMENT_REGEX.exec(content)) !== null) {
    const before = content.slice(0, match.index);
    const startLine = before.split('\n').length;
    matches.push({
      startLine,
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches.length ? { file: filePath, matches, content } : null;
}

function runLinter(options = {}) {
  const {
    targets = [],
    excludes = [],
    excludeDirs = [],
    fix = false,
    force = false,
    dryRun = false,
  } = options;

  const files = new Set();
  const issues = [];
  let fixedCount = 0;

  for (const target of targets) {
    for (const file of findFilesArray(target, {
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
      ignores: excludeDirs,
    })) {
      files.add(file);
    }
  }

  for (const file of files) {
    if (!force && isExcluded(file, excludes)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const match of result.matches) {
      const relPath = path.relative(process.cwd(), file);
      issues.push({
        file: relPath,
        line: match.startLine,
        column: 1,
        message: `Found auto-doc block comment starting on line ${match.startLine}.`,
        rule: 'no-auto-doc',
        severity: 1, // Warning
      });
    }

    if (fix && result.matches.length > 0) {
      if (!dryRun) {
        let newContent = result.content;
        // Iterate backwards to avoid index shifting
        for (let i = result.matches.length - 1; i >= 0; i--) {
          const { start, end } = result.matches[i];
          newContent = newContent.slice(0, start) + newContent.slice(end);
        }
        fs.writeFileSync(file, newContent, 'utf8');
      }
      // Increment fixedCount regardless of dryRun to report what *would* be fixed
      fixedCount++;
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: fixedCount
  };

  return { issues, summary, results: [] };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('remove-auto-doc', lintingConfigPath) || {};
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];
  const configExcludeDirs = config.excludeDirs || [];

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludeDirs.concat(configExcludes);

  const { issues, summary } = runLinter({
    targets: finalTargets,
    excludes,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    force: !!flags.force,
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
