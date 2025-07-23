#!/usr/bin/env node
// scripts/linting/code/no-relative-paths.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  projectRoot,
  fileDiscoveryPath,
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const {
  loadLintSection,
  parseCliArgs
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);

const LINT_DISABLE_TAG = 'lint-disable-next-line';
const LINT_DISABLE_LINE = 'lint-disable-line no-relative-paths';

function classifyRequireLine(line) {
  const code = line.replace(/\/\/.*$/, '').trim();
  if (!code.includes('require(')) return null;

  const match = code.match(/require\((['"`])(.*?)\1\)/);
  if (!match) return null;
  const requiredPath = match[2];

  if (requiredPath.startsWith('.') || requiredPath.startsWith('/')) {
    return {
      type: 'pathlike',
      requiredPath
    };
  } else {
    return {
      type: 'package',
      requiredPath
    };
  }
}

function scanFileForRelativePaths(filePath, debug = false) {
  logger.debug(`[DEBUG] Scanning file: ${path.relative(projectRoot, filePath)}`);
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePathRegex = /(['"`])(\.\/|\.\.\/)/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (index > 0) {
      const prevLine = lines[index - 1].trim();
      if (prevLine.startsWith('//') && prevLine.includes(LINT_DISABLE_TAG)) {
        logger.debug(`[DEBUG] Skipping line ${index + 1} due to lint-disable-next-line`);
        return;
      }
    }
    if (trimmedLine.startsWith('//')) return;

    const hasDisableLine = line.includes(LINT_DISABLE_LINE);

    if (trimmedLine.includes('require(')) {
      const classification = classifyRequireLine(trimmedLine);
      if (classification && classification.type === 'pathlike') {
        if (relativePathRegex.test(`'${classification.requiredPath}'`)) {
          if (!hasDisableLine) {
            issues.push({
              line: index + 1,
              column: line.indexOf(classification.requiredPath) + 1,
              message: `Disallowed relative path in require(): '${classification.requiredPath}'`,
              rule: 'no-relative-require'
            });
          }
        }
      }
    }

    if (trimmedLine.includes('path.join(') || trimmedLine.includes('path.resolve(')) {
      const match = trimmedLine.match(/(path\.(?:join|resolve))\(([^)]*)\)/);
      if (match) {
        const args = match[2].split(',').map(arg => arg.trim());
        args.forEach(arg => {
          if (relativePathRegex.test(arg)) {
            if (!hasDisableLine) {
              issues.push({
                line: index + 1,
                column: line.indexOf(arg) + 1,
                message: `Disallowed relative path argument in ${match[1]}: ${arg}`,
                rule: 'no-relative-path-join'
              });
            }
          }
        });
      }
    }
  });

  return issues;
}

function runLinter(options = {}) {
  const {
    targets = [],
    excludes = [],
    debug = false,
    filetypes = undefined
  } = options;

  logger.debug('[DEBUG] Running no-relative-paths linter with options:', { targets, excludes });

  const allIssues = [];

  const filesToScan = findFiles({
    targets: targets,
    filetypes,
    ignores: excludes,
    debug: debug
  });

  for (const file of filesToScan) {
    const fileIssues = scanFileForRelativePaths(file, debug);
    if (fileIssues.length > 0) {
      allIssues.push(...fileIssues.map(issue => ({
        file: path.relative(projectRoot, file),
        severity: 1,
        ...issue
      })));
    }
  }

  const summary = {
    errorCount: 0,
    warningCount: allIssues.length,
    fixedCount: 0
  };

  return {
    issues: allIssues,
    summary
  };
}

if (require.main === module) {
  const {
    flags,
    targets
  } = parseCliArgs(process.argv.slice(2));

  // Set global debug mode
  logger.setDebugMode(!!flags.debug && !flags.json);

  const config = loadLintSection('no-relative-paths', lintingConfigPath) || {};
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];
  const filetypes = config.filetypes;

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  const {
    issues,
    summary
  } = runLinter({
    targets: finalTargets,
    excludes,
    debug: !!flags.debug,
    filetypes,
    ...flags
  });

  renderLintOutput({
    issues,
    summary,
    flags
  });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = {
  runLinter
};

