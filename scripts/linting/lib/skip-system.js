// scripts/linting/lib/skip-system.js
// Centralized lint skip marker system

require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { lintingConfigPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

// Performance caches
let configCache = null;
let markersCache = null;

// Load linter configuration to build skip markers
function loadLinterConfig() {
  if (configCache) {
    return configCache;
  }

  try {
    const configContent = fs.readFileSync(lintingConfigPath, 'utf8');
    configCache = yaml.load(configContent);
    return configCache;
  } catch (error) {
    logger.error(`Failed to load linting config: ${error.message}`);
    return {};
  }
}

// Generate standardized skip markers from config
function generateSkipMarkers() {
  if (markersCache) {
    return markersCache;
  }

  const config = loadLinterConfig();
  const markers = {};

  // Group linters by category
  const groups = {
    code: [],
    docs: [],
    validators: [],
  };

  // Categorize linters and create simplified aliases
  Object.entries(config).forEach(([linterKey, linterConfig]) => {
    if (linterKey === 'harness') return;

    const group = linterConfig.group || 'unknown';
    if (groups[group]) {
      groups[group].push(linterKey);
    }

    // Create simplified aliases for common linters
    const alias = getSimplifiedAlias(linterKey);

    markers[linterKey] = {
      // Individual linter patterns
      skip: `lint-skip-file ${alias}`,
      disable: `lint-disable ${alias}`,
      enable: `lint-enable ${alias}`,
      disableLine: `lint-skip-line ${alias}`,
      disableNext: `lint-skip-next-line ${alias}`,

      // File-level skip (for markdown comments)
      fileSkip: `<!-- lint-skip-file ${alias} -->`,
      fileDisable: `<!-- lint-disable ${alias} -->`,
      fileEnable: `<!-- lint-enable ${alias} -->`,

      // Group and alias info
      group: group,
      alias: alias,
    };
  });

  // Add group-level markers
  Object.entries(groups).forEach(([groupName, linters]) => {
    markers[`group-${groupName}`] = {
      skip: `lint-skip-file ${groupName}`,
      fileSkip: `<!-- lint-skip-file ${groupName} -->`,
      linters: linters,
    };
  });

  markersCache = markers;
  return markers;
}

// Get simplified alias for common linters
function getSimplifiedAlias(linterKey) {
  const aliases = {
    postman: 'links',
    janitor: 'litter',
    librarian: 'index',
    'no-bad-headers': 'header',
    'no-console': 'logs',
    'no-jsdoc': 'jsdoc',
    'no-relative-paths': 'paths',
    'no-trailing-whitespace': 'ws',
    'validate-mocha': 'mocha',
  };

  return aliases[linterKey] || linterKey;
}

// Get all possible skip patterns for scanning
function getAllSkipPatterns() {
  const patterns = [
    // Standard ESLint-style patterns
    /lint-skip-file\s+([\w\s-]+)/g,
    /lint-skip-line\s+([\w-]+)/g,
    /lint-skip-next-line\s+([\w-]+)/g,
    /lint-disable\s+([\w-]+)/g,
    /lint-enable\s+([\w-]+)/g,

    // HTML comment versions
    /<!--\s*lint-skip-file\s+([\w\s-]+)\s*-->/g,
    /<!--\s*lint-disable\s+([\w-]+)\s*-->/g,
    /<!--\s*lint-enable\s+([\w-]+)\s*-->/g,
  ];

  return patterns;
}

// Map legacy skip markers to standardized ones (kept for backward compatibility)
function getLegacyMigrationMap() {
  return {}; // All legacy patterns have been migrated
}

// Validate skip marker format
function isValidSkipMarker(marker, _linterKey = null) {
  const standardPatterns = [
    /^lint-skip-file\s+[\w\s-]+$/,
    /^lint-skip-line\s+[\w-]+$/,
    /^lint-skip-next-line\s+[\w-]+$/,
    /^lint-disable\s+[\w-]+$/,
    /^lint-enable\s+[\w-]+$/,
    /^<!--\s*lint-skip-file\s+[\w\s-]+\s*-->$/,
    /^<!--\s*lint-disable\s+[\w-]+\s*-->$/,
    /^<!--\s*lint-enable\s+[\w-]+\s*-->$/,
  ];

  return standardPatterns.some((pattern) => pattern.test(marker));
}

// Get skip marker for specific linter and type
function getSkipMarker(linterKey, type = 'skip-file', isComment = false) {
  const markers = generateSkipMarkers();

  if (!markers[linterKey]) {
    throw new Error(`Unknown linter key: ${linterKey}`);
  }

  const alias = markers[linterKey].alias;
  const group = markers[linterKey].group;

  if (type === 'skip-file') {
    return isComment
      ? `<!-- lint-skip-file ${alias} -->`
      : `lint-skip-file ${alias}`;
  } else if (type === 'skip-line') {
    return `lint-skip-line ${alias}`;
  } else if (type === 'skip-next') {
    return `lint-skip-next-line ${alias}`;
  } else if (type === 'skip-group') {
    return isComment
      ? `<!-- lint-skip-file ${group} -->`
      : `lint-skip-file ${group}`;
  } else if (type === 'disable') {
    return isComment
      ? `<!-- lint-disable ${alias} -->`
      : `lint-disable ${alias}`;
  } else if (type === 'enable') {
    return isComment ? `<!-- lint-enable ${alias} -->` : `lint-enable ${alias}`;
  }

  throw new Error(`Unknown skip type: ${type} for linter: ${linterKey}`);
}

// Check if directory should be skipped based on .skipignore file
function shouldSkipDirectory(dirPath, linterKey) {
  const skipignorePath = path.join(dirPath, '.skipignore');

  if (!fs.existsSync(skipignorePath)) {
    return false; // No .skipignore file, don't skip
  }

  try {
    const content = fs.readFileSync(skipignorePath, 'utf8').trim();

    // Empty .skipignore = all linters forbidden
    if (!content) {
      return true;
    }

    const skipEntries = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const markers = generateSkipMarkers()[linterKey];

    if (!markers) return false;

    const alias = markers.alias;
    const group = markers.group;

    // Check if linter should be skipped
    return (
      skipEntries.includes(alias) ||
      skipEntries.includes(linterKey) ||
      skipEntries.includes(group)
    );
  } catch {
    return false; // Error reading file, don't skip
  }
}

// Check if file should be skipped based on directory .skipignore files
function shouldSkipFile(filePath, linterKey) {
  const absolutePath = path.resolve(filePath);
  let currentDir = path.dirname(absolutePath);
  const rootDir = process.cwd();

  // Walk up directory tree checking for .skipignore files
  while (currentDir.startsWith(rootDir)) {
    if (shouldSkipDirectory(currentDir, linterKey)) {
      return true;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  return false;
}

// Check if line should be skipped based on markers
function shouldSkipLine(line, previousLine, linterKey) {
  const markers = generateSkipMarkers()[linterKey];
  if (!markers) return false;

  const alias = markers.alias;
  const group = markers.group;

  // Check for file-level skip
  if (
    line.includes(`lint-skip-file ${alias}`) ||
    line.includes(`lint-skip-file ${group}`) ||
    line.includes(`<!-- lint-skip-file ${alias}`) ||
    line.includes(`<!-- lint-skip-file ${group}`)
  ) {
    return true;
  }

  // Check current line for line-level skip
  if (
    line.includes(`lint-skip-line ${alias}`) ||
    line.includes(`lint-skip-line ${linterKey}`)
  ) {
    return true;
  }

  // Check previous line for next-line skip
  if (
    previousLine &&
    (previousLine.includes(`lint-skip-next-line ${alias}`) ||
      previousLine.includes(`lint-skip-next-line ${linterKey}`))
  ) {
    return true;
  }

  return false;
}

// Extract linter key from skip marker
function extractLinterFromMarker(marker) {
  const patterns = [
    /lint-skip-file\s+([\w\s-]+)/,
    /lint-skip-line\s+([\w-]+)/,
    /lint-skip-next-line\s+([\w-]+)/,
    /lint-disable\s+([\w-]+)/,
    /lint-enable\s+([\w-]+)/,
    // HTML comment versions
    /<!--\s*lint-skip-file\s+([\w\s-]+)\s*-->/,
    /<!--\s*lint-disable\s+([\w-]+)\s*-->/,
    /<!--\s*lint-enable\s+([\w-]+)\s*-->/,
    // ESLint patterns (legitimate ESLint syntax)
    /eslint-disable-line\s+([\w-]+)/,
    /eslint-disable-next-line\s+([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = marker.match(pattern);
    if (match) {
      const extracted = match[1].trim();

      // Handle group names (code, docs, validators)
      if (['code', 'docs', 'validators'].includes(extracted)) {
        return extracted;
      }

      // Handle aliases and convert back to linter keys
      const aliasToKey = {
        links: 'postman',
        index: 'librarian',
        litter: 'janitor',
        paths: 'no-relative-paths',
        jsdoc: 'no-jsdoc',
        header: 'no-bad-headers',
        ws: 'no-trailing-whitespace',
        logs: 'no-console',
        mocha: 'validate-mocha',
      };

      return aliasToKey[extracted] || extracted;
    }
  }

  return null;
}

module.exports = {
  generateSkipMarkers,
  getAllSkipPatterns,
  getLegacyMigrationMap,
  isValidSkipMarker,
  getSkipMarker,
  shouldSkipLine,
  shouldSkipFile,
  shouldSkipDirectory,
  extractLinterFromMarker,
  loadLinterConfig,
};
