#!/usr/bin/env node
// scripts/refactor/logging/inject-logger-import.js

const fs = require('fs');
const path = require('path');
const { findFiles } = require('../../shared/file-helpers');

// Use centralized path management
require('module-alias/register');
const { srcRoot } = require('@paths');

/**
 * Inject or update logger destructure in a file.
 * @param {string} filePath
 * @param {boolean} write
 * @returns {boolean} true if a change would be or was made
 */
function injectLoggerImportInFile(filePath, write = false) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let insertLine = 0;
  let foundPathsImport = false;
  let foundLoggerInDestructure = false;
  let destructureLine = -1;

  // Shebang
  if (lines[0] && lines[0].startsWith('#!')) insertLine++;
  // Head comment
  if (lines[insertLine] && lines[insertLine].match(/^\/\/\s*[\w/.-]+\.js/)) insertLine++;

  // Scan for existing @paths destructure
  for (let i = 0; i < Math.min(10, lines.length); ++i) {
    const line = lines[i];
    const destructureMatch = line.match(/^const\s+\{([^}]+)\}\s*=\s*require\(['"]@paths['"]\);/);
    if (destructureMatch) {
      foundPathsImport = true;
      destructureLine = i;
      if (destructureMatch[1].split(',').map(s => s.trim()).includes('logger')) {
        foundLoggerInDestructure = true;
      }
      break;
    }
  }

  let changed = false;
  if (foundPathsImport && !foundLoggerInDestructure) {
    // Add logger to destructure
    let names = lines[destructureLine].match(/^const\s+\{([^}]+)\}\s*=\s*require\(['"]@paths['"]\);/)[1]
      .split(',').map(s => s.trim());
    if (!names.includes('logger')) names.push('logger');
    lines[destructureLine] = `const { ${names.join(', ')} } = require('@paths');`;
    changed = true;
  } else if (!foundPathsImport) {
    // Insert logger import
    lines.splice(insertLine, 0, 'const { logger } = require(\'@paths\');');
    changed = true;
  }

  if (changed && write) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
  return changed;
}

/**
 * Inject logger import across all JS files under a directory or a list of files.
 * @param {string|string[]} target - directory or array of files
 * @param {boolean} write
 * @returns {object} { filesChanged }
 */
function injectLoggerImport(target, write = false) {
  let files = [];
  if (Array.isArray(target)) {
    files = target;
  } else {
    for (const file of findFiles(target, {
      filter: (name) => name.endsWith('.js') || name.endsWith('.mjs')
    })) {
      files.push(file);
    }
  }
  const filesChanged = [];
  for (const file of files) {
    if (injectLoggerImportInFile(file, write)) {
      filesChanged.push(file);
    }
  }
  return { filesChanged };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const target = args[0]
    ? path.resolve(process.cwd(), args[0])
    : srcRoot;
  const write = args.includes('--write');

  // If a filelist is provided (comma-separated), use that
  let files = [];
  if (target.endsWith('.js') || target.endsWith('.mjs')) {
    files = [target];
  } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const file of findFiles(target, {
      filter: (name) => name.endsWith('.js') || name.endsWith('.mjs')
    })) {
      files.push(file);
    }
  } else if (target.includes(',')) {
    files = target.split(',').map(f => f.trim());
  } else {
    console.error('Target must be a directory or JS file(s).');
    process.exit(1);
  }

  const { filesChanged } = injectLoggerImport(files, write);

  if (write) {
    console.log('\n[WRITE MODE]');
    console.log(`Files changed: ${filesChanged.length}`);
    filesChanged.forEach(f => console.log('  ', f));
  } else {
    console.log('\n[DRY RUN]');
    console.log(`Files that would change: ${filesChanged.length}`);
    filesChanged.forEach(f => console.log('  ', f));
    console.log('\nAdd --write to perform import injection.');
  }
}

module.exports = { injectLoggerImport, injectLoggerImportInFile };

