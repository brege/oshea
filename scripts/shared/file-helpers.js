// scripts/shared/file-helpers.js
// lint-skip-logger
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Centralized glob ignore patterns (for glob)
const DEFAULT_GLOB_IGNORES = [
  'node_modules/**',
  '*-devel/**',
  'assets/**',
  '.git/**',
  '**/pdf-generator.test.2.3.10.js',
];

// Directory names to ignore (non-glob)
const DEFAULT_DIR_IGNORES = [
  'node_modules',
  '.git',
  'assets',
  '*-devel'
];

// Centralized glob patterns for JS files
const DEFAULT_PATTERNS = ['**/*.{js,mjs}'];

// below i am replacing JSDoc with single-line comments



// Returns normalized glob patterns based on CLI args or defaults
function getPatternsFromArgs(argv) {
  if (!argv.length) return DEFAULT_PATTERNS;
  return argv.map(p =>
    p.endsWith('/') ? `${p}**/*.{js,mjs}` : p
  );
}



// Returns the default ignore patterns for glob
function getDefaultGlobIgnores() {
  return DEFAULT_GLOB_IGNORES;
}



// Checks if a string is a glob pattern
function isGlobPattern(str) {
  // Matches *, ?, [, ], {, }, (, ), !
  return /[*?[\]{}()!]/.test(str);
}



// Recursively yields all files matching the filter, skipping ignored directories
// - if the input is a file, yields only that file (if it matches the filter)
// - if the input is missing, warns (for real files/dirs only)
function* findFiles(inputPath, opts = {}) {
  const ignores = opts.ignores || DEFAULT_DIR_IGNORES;
  const filter = opts.filter || (() => true);

  let stat;
  try {
    stat = fs.statSync(inputPath);
  } catch {
    // Only warn for actual files/dirs, not glob patterns!
    if (!isGlobPattern(inputPath)) {
      console.warn(`Warning: ${inputPath} does not exist or is not accessible.`);
    }
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



// Accepts an array of inputs (globs, files, dirs) and returns a flat array of files
// - expands glob patterns to files
// - only calls findFiles on real files/dirs
function findFilesArray(inputs, opts = {}) {
  let files = [];
  for (const input of Array.isArray(inputs) ? inputs : [inputs]) {
    if (isGlobPattern(input)) {
      // Expand glob pattern to files
      files.push(...glob.sync(input, { nodir: true, ignore: opts.ignores || [] }));
    } else {
      // Only call findFiles on real files/dirs
      files.push(...Array.from(findFiles(input, opts)));
    }
  }
  return files;
}

module.exports = {
  findFiles,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  findFilesArray,
  isGlobPattern,
};
