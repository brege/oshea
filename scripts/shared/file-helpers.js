// scripts/shared/file-helpers.js
const fs = require('fs');
const path = require('path');

// Centralized glob ignore patterns (for glob)
const DEFAULT_GLOB_IGNORES = [
  'node_modules/**',
  '*-devel/**',
  'assets/**',
  '.git/**',
  '**/pdf-generator.test.2.3.10.js',
];

// Centralized glob patterns for JS/MJS files
const DEFAULT_PATTERNS = ['**/*.{js,mjs}'];

/**
 * Returns normalized glob patterns based on CLI args or defaults.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {string[]} patterns
 */
function getPatternsFromArgs(argv) {
  if (!argv.length) return DEFAULT_PATTERNS;
  return argv.map(p =>
    p.endsWith('/') ? `${p}**/*.{js,mjs}` : p
  );
}

/**
 * Returns the default ignore patterns for glob.
 * @returns {string[]}
 */
function getDefaultGlobIgnores() {
  return DEFAULT_GLOB_IGNORES;
}

/**
 * Recursively yields all files matching the filter, skipping ignored directories.
 * If the input is a file, yields just that file if it matches the filter.
 * @param {string} inputPath - File or directory path
 * @param {Object} [opts]
 * @param {string[]} [opts.ignores] - Directory names to ignore (non-glob)
 * @param {(filename: string) => boolean} [opts.filter] - Function to filter files
 */
function* findFiles(inputPath, opts = {}) {
  const ignores = opts.ignores || DEFAULT_DIR_IGNORES;
  const filter = opts.filter || (() => true);

  let stat;
  try {
    stat = fs.statSync(inputPath);
  } catch (err) {
    console.warn(`Warning: ${inputPath} does not exist or is not accessible.`);
    return;
  }

  if (stat.isFile()) {
    if (filter(path.basename(inputPath))) {
      yield inputPath;
    }
    return;
  }

  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(inputPath, { withFileTypes: true })) {
      const fullPath = path.join(inputPath, entry.name);
      if (entry.isDirectory()) {
        if (!ignores.includes(entry.name)) {
          yield* findFiles(fullPath, opts);
        }
      } else if (entry.isFile() && filter(entry.name)) {
        yield fullPath;
      }
    }
  }
}

module.exports = {
  findFiles,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
};

