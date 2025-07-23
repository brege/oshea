#!/usr/bin/env node
// scripts/linting/code/remove-jsdoc.js

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

const {
  loadLintSection,
  parseCliArgs,
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);
const logger = require(loggerPath);

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
    fix = false,
    dryRun = false,
    debug = false,
    filetypes = undefined
  } = options;

  const issues = [];
  let fixedCount = 0;

  const files = findFiles({
    targets: targets,
    ignores: excludes,
    filetypes,
    debug: debug
  });

  for (const file of files) {
    const result = scanFile(file);
    if (!result) continue;

    for (const match of result.matches) {
      const relPath = path.relative(projectRoot, file);
      issues.push({
        file: relPath,
        line: match.startLine,
        column: 1,
        message: `Found jsdoc block comment starting on line ${match.startLine}.`,
        rule: 'no-jsdoc',
        severity: 1,
      });
    }

    if (fix && result.matches.length > 0) {
      if (!dryRun) {
        let newContent = result.content;
        for (let i = result.matches.length - 1; i >= 0; i--) {
          const { start, end } = result.matches[i];
          newContent = newContent.slice(0, start) + newContent.slice(end);
        }
        fs.writeFileSync(file, newContent, 'utf8');
      }
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

  // Set global debug mode
  logger.setDebugMode(!!flags.debug);

  const config = loadLintSection('remove-jsdoc', lintingConfigPath) || {};
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];
  const filetypes = config.filetypes;

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  const { issues, summary } = runLinter({
    targets: finalTargets,
    excludes,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    force: !!flags.force,
    debug: !!flags.debug,
    filetypes
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
