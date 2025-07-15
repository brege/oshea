#!/usr/bin/env node
// scripts/linting/code/standardize-js-line-one-all.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getFirstDir,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  loadLintSection,
} = require(lintHelpersPath);

function runLinter({
  patterns = [],
  ignores = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
} = {}) {
  const files = new Set();

  for (const file of findFilesArray('.', {
    filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  const changedFiles = [];
  const mismatches = [];
  let warnings = 0;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const lines = originalContent.split('\n');

    let changed = false;
    let headerLineIndex = 0;

    // Shebang handling
    if (lines[0].startsWith('#!')) {
      headerLineIndex = 1;
      if (!lines[1]?.startsWith('//')) {
        if (fix && !dryRun) {
          lines.splice(1, 0, `// ${relPath}`);
          changed = true;
        } else if (!quiet && !json) {
          console.log(chalk.yellow(`Would standardize: ${relPath}`));
        }
      }
    } else {
      if (!lines[0]?.startsWith('//')) {
        if (fix && !dryRun) {
          lines.unshift(`// ${relPath}`);
          changed = true;
        } else if (!quiet && !json) {
          console.log(chalk.yellow(`Would standardize: ${relPath}`));
        }
      }
    }

    // After possible insertion, get current header line
    const headerLine = lines[headerLineIndex];
    const headerMatch = headerLine && headerLine.match(/^\/\/\s*(.+)$/);

    if (headerMatch) {
      const headerPath = headerMatch[1].trim();
      const fileFirstDir = getFirstDir(relPath);
      const headerFirstDir = getFirstDir(headerPath);

      if (fileFirstDir !== headerFirstDir) {
        warnings++;
        mismatches.push({ file: relPath, header: headerPath });
        if (!quiet && !json) {
          console.warn(
            chalk.yellow(
              `WARNING: Top-level directory mismatch for ${relPath} (header: ${headerPath})`
            )
          );
        }
      }

      if (headerPath !== relPath && fix && !dryRun) {
        lines[headerLineIndex] = `// ${relPath}`;
        changed = true;
      } else if (headerPath !== relPath && (!quiet && !json) && (!fix || dryRun)) {
        console.log(chalk.yellow(`Would standardize: ${relPath}`));
      }
    }

    if (changed) {
      const newContent = lines.join('\n');
      if (newContent !== originalContent) {
        if (fix && !dryRun) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          changedFiles.push(relPath);
          if (!quiet && !json) {
            console.log(`Standardized: ${relPath}`);
          }
        }
      }
    }
  }

  const summary = {
    changed: changedFiles,
    mismatches,
    warnings,
  };

  if (json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  } else if (!quiet && warnings > 0) {
    console.warn(chalk.yellow(`\n${warnings} file(s) had top-level directory mismatches.`));
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Changed:', changedFiles);
    console.log('[DEBUG] Mismatches:', mismatches);
    if (dryRun) {
      console.log('[DEBUG] Dry-run mode enabled — no files were written.');
    }
  }

  process.exitCode = warnings > 0 ? 1 : 0;
  return summary;
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('standardize-line-one', lintingConfigPath) || {};

  const patterns = targets.length > 0
    ? getPatternsFromArgs(targets)
    : (config.targets || []);

  const ignores = config.excludes || getDefaultGlobIgnores();

  runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
  });
}

module.exports = { runLinter };

