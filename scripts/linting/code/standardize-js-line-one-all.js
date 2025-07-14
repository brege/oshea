#!/usr/bin/env node
// scripts/linting/code/standardize-js-line-one-all.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { lintHelpersPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getFirstDir,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
} = require(lintHelpersPath);

function runLinter({
  patterns = [],
  ignores = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
} = {}) {
  // Use patterns and ignores to find all JS/MJS files
  const { minimatch } = require('minimatch');
  let files = new Set();
  for (const file of findFilesArray('.', {
    filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  let warnings = 0;
  let changedFiles = [];
  let mismatches = [];

  files.forEach(filePath => {
    const relPath = path.relative(process.cwd(), filePath);
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const lines = originalContent.split('\n');

    let changed = false;
    let headerLineIndex = 0;

    // Shebang handling
    if (lines[0].startsWith('#!')) {
      headerLineIndex = 1;
      if (!lines[1]?.startsWith('//')) {
        if (fix) {
          lines.splice(1, 0, `// ${relPath}`);
          changed = true;
        }
      }
    } else {
      if (!lines[0]?.startsWith('//')) {
        if (fix) {
          lines.unshift(`// ${relPath}`);
          changed = true;
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
      if (headerPath !== relPath && fix) {
        lines[headerLineIndex] = `// ${relPath}`;
        changed = true;
      }
    }

    if (changed) {
      const newContent = lines.join('\n');
      if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        changedFiles.push(relPath);
        if (!quiet && !json) {
          console.log(`Standardized: ${relPath}`);
        }
      }
    }
  });

  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          changed: changedFiles,
          mismatches,
          warnings,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!quiet && warnings > 0) {
    console.warn(chalk.yellow(`\n${warnings} file(s) had top-level directory mismatches.`));
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Changed:', changedFiles);
    console.log('[DEBUG] Mismatches:', mismatches);
  }

  return { changed: changedFiles, mismatches, warnings };
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const patterns = getPatternsFromArgs(targets);
  const ignores = getDefaultGlobIgnores();

  runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
  });
}

module.exports = { runLinter };

