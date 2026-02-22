// scripts/linting/lib/file-discovery.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { minimatch } = require('minimatch');
const { projectRoot, fileHelpersPath, loggerPath } = require('@paths');
const { isGlobPattern } = require(fileHelpersPath);
const logger = require(loggerPath);

// Cache for findCandidates to avoid repeated filesystem scans
const candidatesCache = new Map();

// Hardcoded core directories to always exclude from linting.
const CORE_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  'assets/**',
  'docs/archive/**',
  'package*.json',
];

// Only allow these extensions if filetypes is not explicitly set.
const SAFE_DEFAULTS = ['.js', '.json', '.md', '.sh', '.yaml', '.txt'];

function getEslintIgnorePatterns() {
  const eslintIgnorePath = path.join(projectRoot, '.eslintignore');
  if (fs.existsSync(eslintIgnorePath)) {
    try {
      return fs
        .readFileSync(eslintIgnorePath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((pattern) => {
          // If a pattern from .eslintignore is a directory, match all sub-contents
          if (pattern.endsWith('/')) {
            return `${pattern.slice(0, -1)}/**`;
          }
          return pattern;
        });
    } catch (e) {
      if (process.env.DEBUG) {
        logger.warn(`Could not read .eslintignore file: ${e.message}`, {
          context: 'FileDiscovery',
        });
      }
      return [];
    }
  }
  return [];
}

function getDocignorePatterns(root) {
  const ignoredDirs = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      if (entries.some((e) => e.isFile() && e.name === '.docignore')) {
        ignoredDirs.push(path.resolve(dir));
        return;
      }
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !['node_modules', '.git'].includes(entry.name)
        ) {
          walk(path.join(dir, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }
  }
  walk(root);
  return ignoredDirs.map((absDir) =>
    path.join(path.relative(projectRoot, absDir), '**').replace(/\\/g, '/'),
  );
}

function fileHasSkipTag(filePath, skipTag) {
  if (!skipTag) return false;
  try {
    return fs.readFileSync(filePath, 'utf8').includes(skipTag);
  } catch {
    return false;
  }
}

// Default to common text file types if filetypes not set.
function hasAllowedExt(filename, filetypes) {
  const ext = path.extname(filename).toLowerCase();
  if (filetypes && Array.isArray(filetypes) && filetypes.length) {
    return filetypes.includes(ext);
  }
  return SAFE_DEFAULTS.includes(ext);
}

function* walkDir(dir, options) {
  const { ignores = [], fileFilter = () => true, filetypes = null } = options;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
      if (
        ignores.some((pattern) => minimatch(relPath, pattern, { dot: true }))
      ) {
        continue;
      }
      if (entry.isDirectory()) {
        yield* walkDir(fullPath, options);
      } else if (
        entry.isFile() &&
        fileFilter(fullPath) &&
        hasAllowedExt(fullPath, filetypes)
      ) {
        yield fullPath;
      }
    }
  } catch {
    // Suppress errors
  }
}

function findFiles(options = {}) {
  const {
    targets,
    ignores = [],
    fileFilter = () => true,
    filetypes = null,
    respectDocignore = false,
    docignoreRoot = projectRoot,
    skipTag = null,
    debug = false, // eslint-disable-line no-unused-vars
  } = options;

  logger.debug(` Received targets: ${JSON.stringify(targets)}`, {
    context: 'FileDiscovery',
  });

  const eslintIgnores = getEslintIgnorePatterns();
  const combinedIgnores = [
    ...new Set([...CORE_IGNORES, ...eslintIgnores, ...ignores]),
  ];

  if (respectDocignore) {
    const docIgnores = getDocignorePatterns(docignoreRoot);
    if (docIgnores.length > 0) {
      logger.debug(
        ` Applying .docignore patterns: ${JSON.stringify(docIgnores)}`,
        { context: 'FileDiscovery' },
      );
    }
    combinedIgnores.push(...docIgnores);
  }
  logger.debug(
    ` Using combined ignore patterns: ${JSON.stringify(combinedIgnores)}`,
    { context: 'FileDiscovery' },
  );

  const matchedFiles = new Set();
  const allTargets = Array.isArray(targets) ? targets : [targets];

  for (const target of allTargets) {
    if (isGlobPattern(target)) {
      logger.debug(` Processing '${target}' as a glob pattern.`, {
        context: 'FileDiscovery',
      });
      const matches = glob.sync(target, {
        cwd: projectRoot,
        absolute: true,
        nodir: true,
        ignore: combinedIgnores,
        dot: true,
      });
      matches.forEach((m) => {
        if (hasAllowedExt(m, filetypes)) matchedFiles.add(m);
      });
    } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      logger.debug(` Processing '${target}' as a directory.`, {
        context: 'FileDiscovery',
      });
      for (const file of walkDir(target, {
        ignores: combinedIgnores,
        fileFilter,
        filetypes,
      })) {
        matchedFiles.add(file);
      }
    } else if (fs.existsSync(target)) {
      logger.debug(` Processing '${target}' as a direct file path.`, {
        context: 'FileDiscovery',
      });
      if (hasAllowedExt(target, filetypes))
        matchedFiles.add(path.resolve(target));
    } else {
      logger.debug(
        ` Target '${target}' does not exist and is not a valid glob. Skipping.`,
        { context: 'FileDiscovery' },
      );
    }
  }
  logger.debug(` Total unique paths found: ${matchedFiles.size}`, {
    context: 'FileDiscovery',
  });

  const finalFiles = [];
  for (const file of matchedFiles) {
    const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
    if (
      combinedIgnores.some((pattern) =>
        minimatch(relPath, pattern, { dot: true }),
      )
    ) {
      logger.debug(
        ` Skipping file matching combined ignore pattern: ${relPath}`,
        { context: 'FileDiscovery' },
      );
      continue;
    }
    if (skipTag && fileHasSkipTag(file, skipTag)) {
      logger.debug(` Skipping file with tag '${skipTag}': ${relPath}`, {
        context: 'FileDiscovery',
      });
      continue;
    }
    if (fileFilter(file) && hasAllowedExt(file, filetypes)) {
      finalFiles.push(file);
    }
  }

  logger.debug(` Returning ${finalFiles.length} files after all filtering.`, {
    context: 'FileDiscovery',
  });
  return finalFiles;
}

function findCandidates(ref, allowedExts, rootDirs = ['.']) {
  // Create cache key from parameters
  const cacheKey = `${ref}:${allowedExts.join(',')}:${rootDirs.join(',')}`;

  if (candidatesCache.has(cacheKey)) {
    return candidatesCache.get(cacheKey);
  }

  const normRef = ref.replace(/\\/g, '/');
  const candidates = new Set();
  const allFiles = findFiles({
    targets: rootDirs,
    fileFilter: (name) => allowedExts.some((ext) => name.endsWith(ext)),
  });

  for (const file of allFiles) {
    const relFile = path.relative(projectRoot, file).replace(/\\/g, '/');
    const base = path.basename(relFile);
    if (relFile.endsWith(normRef) || base === normRef) {
      candidates.add(file);
    }
  }

  const result = Array.from(candidates);
  candidatesCache.set(cacheKey, result);
  return result;
}

module.exports = { findFiles, findCandidates };
