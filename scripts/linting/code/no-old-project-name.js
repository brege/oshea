#!/usr/bin/env node
// scripts/linting/code/no-old-project-name.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  projectRoot,
  fileDiscoveryPath,
  skipSystemPath,
  loggerPath
} = require('@paths');

const {
  loadLintSection,
  parseCliArgs,
} = require(lintHelpersPath);

const logger = require(loggerPath);
const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);
const { shouldSkipLine, shouldSkipFile } = require(skipSystemPath);

function buildPatterns(config) {
  const oldNames = config.old_names || {};
  const newNames = config.new_names || {};

  const primary = oldNames.primary || 'md-to-pdf';
  const constant = oldNames.constant || 'MD_TO_PDF';
  const camelCase = oldNames.camelCase || 'mdToPdf';
  const snakeCase = oldNames.snake_case || 'md_to_pdf';

  return [
    {
      name: 'primary',
      regex: new RegExp(escapeRegex(primary), 'g'),
      severity: 2,
      message: `Old project name "${primary}" should be updated`,
      replace: (match, newName) => newNames.primary || newName,
      configKey: 'primary'
    },
    {
      name: 'constant',
      regex: new RegExp(escapeRegex(constant), 'g'),
      severity: 2,
      message: `Old constant name "${constant}" should be updated`,
      replace: (match, newName) => newNames.constant || (newName ? newName.toUpperCase().replace(/-/g, '_') : match),
      configKey: 'constant'
    },
    {
      name: 'camelCase',
      regex: new RegExp(escapeRegex(camelCase), 'g'),
      severity: 2,
      message: `Old camelCase name "${camelCase}" should be updated`,
      replace: (match, newName) => newNames.camelCase || (newName ? newName.replace(/-([a-z])/g, (_, char) => char.toUpperCase()) : match),
      configKey: 'camelCase'
    },
    {
      name: 'snake_case',
      regex: new RegExp(escapeRegex(snakeCase), 'g'),
      severity: 2,
      message: `Old snake_case name "${snakeCase}" should be updated`,
      replace: (match, newName) => newNames.snake_case || (newName ? newName.replace(/-/g, '_') : match),
      configKey: 'snake_case'
    },
    {
      name: 'github-urls',
      regex: new RegExp('(github\\.com[\\/\\w-]*)\\/' + escapeRegex(primary), 'gi'),
      severity: 2,
      message: 'GitHub URL reference must be updated',
      replace: (match, prefix, newName) => `${prefix}/${newNames.primary || newName}`
    },
    {
      name: 'npm-refs',
      regex: new RegExp('(npm[\\/\\s\\w-]*)' + escapeRegex(primary), 'gi'),
      severity: 2,
      message: 'npm package reference must be updated',
      replace: (match, prefix, newName) => `${prefix}${newNames.primary || newName}`
    },
    {
      name: 'bin-refs',
      regex: new RegExp('((bin|command|executable)[\\/\\s"\':]*)' + escapeRegex(primary), 'gi'),
      severity: 2,
      message: 'Binary/executable reference must be updated',
      replace: (match, prefix, _, newName) => `${prefix}${newNames.primary || newName}`
    },
    {
      name: 'human-readable',
      regex: /(Markdown to PDF|MD to PDF)/gi,
      severity: 1,
      message: 'Human-readable reference should be updated for consistency',
      replace: (match, _, newName) => {
        if (!newName) return match;
        const titleCase = newName.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return match.toLowerCase().includes('markdown') ?
          `Markdown to ${titleCase}` :
          `MD to ${titleCase}`;
      }
    },
    {
      name: 'path-refs',
      regex: new RegExp('([\\/\\\\])' + escapeRegex(primary) + '([\\/\\\\]?)', 'g'),
      severity: 1,
      message: 'Path reference should be verified and updated if needed',
      replace: (match, prefix, suffix, newName) => `${prefix}${newNames.primary || newName}${suffix}`
    },
  ];
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scanFile(filePath, patterns, ignoreMatches = []) {
  if (shouldSkipFile(filePath, 'no-old-project-name')) {
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const lines = content.split('\n');
  const hits = [];

  lines.forEach((line, idx) => {
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line))) {
        const matchText = match[0];

        // Check if this match should be ignored
        const shouldIgnoreMatch = ignoreMatches.some(ignorePattern => {
          if (typeof ignorePattern === 'string') {
            return line.includes(ignorePattern);
          }
          // Support regex patterns in ignore list
          if (ignorePattern instanceof RegExp) {
            return ignorePattern.test(line);
          }
          return false;
        });

        if (!shouldIgnoreMatch) {
          hits.push({
            type: pattern.name,
            line: idx + 1,
            column: match.index + 1,
            code: line.trim(),
            match: matchText,
            severity: pattern.severity,
            message: pattern.message
          });
        }

        if (pattern.regex.lastIndex === match.index) {
          pattern.regex.lastIndex++;
        }
      }
    }
  });

  hits.forEach(hit => {
    const lineContent = lines[hit.line - 1];
    const prevLine = lines[hit.line - 2] || '';
    hit.ignore = shouldSkipLine(lineContent, prevLine, 'no-old-project-name');
  });

  return hits.length ? { file: filePath, hits } : null;
}

function runLinter(options = {}) {
  const {
    targets = [],
    excludes = [],
    debug = false,
    filetypes = undefined,
    fix = false,
    dryRun = false,
    newName = null,
    config = {}
  } = options;

  const patterns = buildPatterns(config);
  const newNames = config.new_names || {};
  const ignoreMatches = config.ignore_matches || [];

  // Check if we need new name for fixing
  const hasConfiguredNames = Object.values(newNames).some(name => name && name.trim());
  if (fix && !newName && !hasConfiguredNames) {
    throw new Error('--new-name is required when using --fix (or configure new_names in config)');
  }

  const issues = [];
  const changedFiles = new Set();

  const files = findFiles({
    targets: targets,
    ignores: excludes,
    filetypes,
    skipTag: 'lint-skip-file no-old-project-name',
    debug: debug
  });

  for (const file of files) {
    const result = scanFile(file, patterns, ignoreMatches);
    if (!result) continue;

    let fileContent;
    let hasChanges = false;

    if (fix) {
      fileContent = fs.readFileSync(file, 'utf8');
    }

    for (const hit of result.hits) {
      if (hit.ignore) continue;

      issues.push({
        file: path.relative(projectRoot, file),
        line: hit.line,
        column: hit.column,
        message: hit.message,
        rule: `no-old-project-name/${hit.type}`,
        severity: hit.severity,
        code: hit.code,
        match: hit.match,
      });

      if (fix) {
        // Find the pattern that created this hit
        const pattern = patterns.find(p => p.name === hit.type);
        if (pattern && pattern.replace) {
          // Reset regex and find the match again to get capture groups
          pattern.regex.lastIndex = 0;
          let match; // eslint-disable-line no-unused-vars
          const tempContent = fileContent;

          // Replace all occurrences of this pattern
          fileContent = fileContent.replace(pattern.regex, (...args) => {
            const fullMatch = args[0];
            const groups = args.slice(1, -2); // exclude last two args (offset, string)
            try {
              return pattern.replace(fullMatch, ...groups, newName);
            } catch (err) {
              logger.warn(`Failed to replace "${fullMatch}" with pattern ${pattern.name}: ${err.message}`);
              return fullMatch; // Keep original if replacement fails
            }
          });

          if (fileContent !== tempContent) {
            hasChanges = true;
          }
        }
      }
    }

    if (fix && hasChanges) {
      if (!dryRun) {
        fs.writeFileSync(file, fileContent, 'utf8');
      }
      changedFiles.add(path.relative(projectRoot, file));
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: changedFiles.size
  };

  return { issues, summary, results: [] };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));

  logger.setDebugMode(!!flags.debug);

  // Extract new-name from args if provided
  const args = process.argv.slice(2);
  const newNameIndex = args.findIndex(arg => arg === '--new-name');
  const newName = newNameIndex !== -1 && newNameIndex + 1 < args.length ? args[newNameIndex + 1] : null;

  const config = loadLintSection('no-old-project-name', lintingConfigPath) || {};
  const hasConfiguredNames = config.new_names && Object.values(config.new_names).some(name => name && name.trim());

  if (flags.fix && !newName && !hasConfiguredNames) {
    logger.error('--new-name is required when using --fix (or configure new_names in config)');
    logger.info('Example: node scripts/linting/code/no-old-project-name.js --fix --new-name my-new-project src/');
    process.exit(1);
  }
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];
  const filetypes = config.filetypes;

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;

  const { issues, summary } = runLinter({
    targets: finalTargets,
    excludes,
    config: config,
    filetypes,
    debug: !!flags.debug,
    fix: flags.fix,
    dryRun: flags.dryRun,
    newName: newName
  });

  if (flags.fix) {
    if (summary.fixedCount > 0) {
      logger.info(`Fixed ${summary.fixedCount} files${flags.dryRun ? ' (dry run)' : ''}`);
    } else {
      logger.info('No files needed fixing');
    }
  }

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
