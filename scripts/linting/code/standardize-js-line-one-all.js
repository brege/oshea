#!/usr/bin/env node
// scripts/linting/code/standardize-js-line-one-all.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { fileHelpersPath } = require('@paths');
const { getPatternsFromArgs, getDefaultGlobIgnores } = require(fileHelpersPath);

const patterns = getPatternsFromArgs(process.argv.slice(2));
const ignore = getDefaultGlobIgnores();

/**
 * Recursively find all files matching the given glob patterns, honoring ignore patterns.
 * (This replaces the direct use of glob.sync for consistency with your helpers.)
 */
function findMatchingFiles(patterns, ignore) {
  const glob = require('glob');
  const files = new Set();
  for (const pattern of patterns) {
    glob.sync(pattern, { ignore, dot: true }).forEach(f => files.add(f));
  }
  return Array.from(files);
}

function getFirstDir(filepath) {
  return filepath.replace(/^\.?\//, '').split(path.sep)[0];
}

const files = findMatchingFiles(patterns, ignore);

let warnings = 0;

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
      lines.splice(1, 0, `// ${relPath}`);
      changed = true;
    }
  } else {
    if (!lines[0]?.startsWith('//')) {
      lines.unshift(`// ${relPath}`);
      changed = true;
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
      console.warn(
        chalk.yellow(
          `WARNING: Top-level directory mismatch for ${relPath} (header: ${headerPath})`
        )
      );
    }
    // Optionally, auto-fix the header to match actual path
    if (headerPath !== relPath) {
      lines[headerLineIndex] = `// ${relPath}`;
      changed = true;
    }
  }

  if (changed) {
    const newContent = lines.join('\n');
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Standardized: ${relPath}`);
    }
  }
});

if (warnings > 0) {
  console.warn(chalk.yellow(`\n${warnings} file(s) had top-level directory mismatches.`));
}

