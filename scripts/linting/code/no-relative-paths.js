#!/usr/bin/env node
// scripts/linting/code/no-relative-paths.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath,
  projectRoot
} = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs
} = require(lintHelpersPath);
const {
  renderLintOutput
} = require(formattersPath);

const LINT_DISABLE_TAG = 'lint-disable-next-line';

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
  if (debug) console.log(`[DEBUG] Scanning file: ${path.relative(projectRoot, filePath)}`);
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePathRegex = /(['"`])(\.\/|\.\.\/)/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    // Check lint-disable-next-line on the previous line
    if (index > 0) {
      const prevLine = lines[index - 1].trim();
      if (prevLine.startsWith('//') && prevLine.includes(LINT_DISABLE_TAG)) {
        if (debug) {
          console.log(`[DEBUG] Skipping line ${index + 1} in ${filePath} due to lint-disable-next-line`);
        }
        return;
      }
    }
    if (trimmedLine.startsWith('//')) return;

    if (trimmedLine.includes('require(')) {
      const classification = classifyRequireLine(trimmedLine);
      if (classification && classification.type === 'pathlike') {
        if (relativePathRegex.test(`'${classification.requiredPath}'`)) {
          issues.push({
            line: index + 1,
            column: line.indexOf(classification.requiredPath) + 1,
            message: `Disallowed relative path in require(): '${classification.requiredPath}'`,
            rule: 'no-relative-require'
          });
        }
      }
    }

    if (trimmedLine.includes('path.join(') || trimmedLine.includes('path.resolve(')) {
      const match = trimmedLine.match(/(path\.(?:join|resolve))\(([^)]*)\)/);
      if (match) {
        const args = match[2].split(',').map(arg => arg.trim());
        args.forEach(arg => {
          if (relativePathRegex.test(arg)) {
            issues.push({
              line: index + 1,
              column: line.indexOf(arg) + 1,
              message: `Disallowed relative path argument in ${match[1]}: ${arg}`,
              rule: 'no-relative-path-join'
            });
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
  } = options;

  if (debug) {
    console.log('[DEBUG] Running no-relative-paths linter with options:', { targets, excludes });
  }

  // Normalize excludes (optional - helps ensure directories are globbed properly)
  const normalizedExcludes = excludes.map(p => {
    if (p.endsWith('/')) return p + '**';
    if (p.includes('*')) return p;
    return p + '/**';
  });

  const allIssues = [];

  const filesToScan = findFilesArray(targets, {
    filter: (name) => name.endsWith('.js') || name.endsWith('.mjs'),
    ignores: normalizedExcludes,
    debug: debug
  });

  if (debug) console.log(`[DEBUG] Found ${filesToScan.length} total files matching targets.`);

  for (const file of filesToScan) {
    if (isExcluded(file, excludes)) {
      if (debug) console.log(`[DEBUG] Skipping excluded file: ${path.relative(projectRoot, file)}`);
      continue;
    }
    const fileIssues = scanFileForRelativePaths(file, debug);
    if (fileIssues.length > 0) {
      allIssues.push(...fileIssues.map(issue => ({
        file: path.relative(projectRoot, file),
        severity: 1, // Warning
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
  const config = loadLintSection('no-relative-paths', lintingConfigPath) || {};
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];

  const finalTargets = targets.length ? targets : configTargets;
  // Respect --force to disable excludes
  const excludes = flags.force ? [] : configExcludes;

  const {
    issues,
    summary
  } = runLinter({
    targets: finalTargets,
    excludes,
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

