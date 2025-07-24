#!/usr/bin/env node
// scripts/linting/code/no-relative-paths.js

require('module-alias/register');

const fs = require('fs').promises;
const path = require('path');
const pLimit = require('p-limit');

// Control file processing concurrency
const fileLimit = pLimit(10);
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  projectRoot,
  fileDiscoveryPath,
  skipSystemPath,
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const {
  loadLintSection,
  parseCliArgs
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);
const { shouldSkipLine, shouldSkipFile } = require(skipSystemPath);

// Using centralized skip system - no more hardcoded constants needed

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

async function scanFileForRelativePaths(filePath, debug = false) {
  try {
  // Check if file should be skipped based on .skipignore files
    if (shouldSkipFile(filePath, 'no-relative-paths')) {
      return [];
    }

    logger.debug(`[DEBUG] Scanning file: ${path.relative(projectRoot, filePath)}`);
    const issues = [];
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePathRegex = /(['"`])(\.\/|\.\.\/)/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('//')) return;

      const prevLine = index > 0 ? lines[index - 1].trim() : '';
      const hasSkip = shouldSkipLine(line, prevLine, 'no-relative-paths');

      if (trimmedLine.includes('require(')) {
        const classification = classifyRequireLine(trimmedLine);
        if (classification && classification.type === 'pathlike') {
          if (relativePathRegex.test(`'${classification.requiredPath}'`)) {
            if (!hasSkip) {
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
              if (!hasSkip) {
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
  } catch (error) {
    logger.error(`Failed to read file ${filePath}: ${error.message}`);
    return [];
  }
}

async function runLinter(options = {}) {
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

  // Process files concurrently with controlled concurrency
  const scanPromises = filesToScan.map(file =>
    fileLimit(async () => {
      const fileIssues = await scanFileForRelativePaths(file, debug);
      if (fileIssues.length > 0) {
        return fileIssues.map(issue => ({
          file: path.relative(projectRoot, file),
          severity: 1,
          ...issue
        }));
      }
      return [];
    })
  );

  const results = await Promise.all(scanPromises);
  allIssues.push(...results.flat());

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
  (async () => {
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

    try {
      const {
        issues,
        summary
      } = await runLinter({
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
    } catch (error) {
      logger.error('Linter failed:', error.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = {
  runLinter
};

