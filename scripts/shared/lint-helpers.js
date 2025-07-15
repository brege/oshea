// scripts/shared/lint-helpers.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { minimatch } = require('minimatch');
const { findFiles, getPatternsFromArgs, getDefaultGlobIgnores } = require('./file-helpers');
const { lintingConfigPath } = require('@paths');

/**
 * Load a specific top-level section from the lint config YAML.
 * @param {string} section - Canonical key (e.g., 'remove-auto-doc')
 * @param {string} configPath - Optional override path to config file
 * @returns {object} - The section config
 */
function loadLintSection(section, configPath = lintingConfigPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);
  if (!config[section]) {
    throw new Error(`Section '${section}' not found in ${configPath}`);
  }
  return config[section];
}

/**
 * Load the full lint config YAML.
 * @param {string} configPath - Optional override path
 * @returns {object} - Full parsed config
 */
function loadLintConfig(configPath = lintingConfigPath) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent);
  } catch (error) {
    console.error('Error loading lint config:', error.message);
    process.exit(1);
  }
}

/**
 * Wrapper around findFiles that returns an array.
 */
function findFilesArray(...args) {
  return Array.from(findFiles(...args));
}

/**
 * Check if a file path matches any of the given exclusion patterns.
 */
function isExcluded(filePath, patterns) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return patterns.some(pattern => minimatch(relPath, pattern));
}

/**
 * Parse CLI arguments into flags, targets, and optional step filter.
 * Supports:
 *   --fix
 *   --quiet
 *   --json
 *   --debug
 *   --force
 *   --dry-run
 *   --config
 *   --list
 *   --only
 *   --skip
 */
function parseCliArgs(args) {
  const flags = {
    fix: false,
    quiet: false,
    json: false,
    debug: false,
    force: false,
    config: false,
    list: false,
    dryRun: false,
    skip: false,
  };

  const stepAliases = {
    '--remove-ws': 'Strip Trailing Whitespace',
    '--eslint': 'ESLint',
    '--doc-links': 'Check Markdown Links (Postman)',
    // Add more aliases if needed
  };

  let only = null;
  const targets = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (stepAliases[arg]) {
      only = stepAliases[arg];
    } else if (arg === '--only') {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        only = next;
        i++; // Skip next arg
      }
    } else if (arg.startsWith('--only=')) {
      only = arg.replace('--only=', '');
    } else if (arg === '--fix') {
      flags.fix = true;
    } else if (arg === '--quiet') {
      flags.quiet = true;
    } else if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--debug') {
      flags.debug = true;
    } else if (arg === '--force') {
      flags.force = true;
    } else if (arg === '--config') {
      flags.config = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--list') {
      flags.list = true;
    } else if (arg === '--skip') {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags.skip = next;
        i++;
      }
    } else if (arg.startsWith('--skip=')) {
      flags.skip = arg.replace('--skip=', '');
    } else if (arg.startsWith('--')) {
      const flagName = arg.replace(/^--/, '');
      flags[flagName] = true;
    } else {
      targets.push(arg);
    }
  }

  return { flags, targets, only };
}

/**
 * Get the first directory segment of a file path.
 */
function getFirstDir(filepath) {
  return filepath.replace(/^\.?\//, '').split(path.sep)[0];
}

module.exports = {
  loadLintSection,
  loadLintConfig,
  findFilesArray,
  isExcluded,
  parseCliArgs,
  getFirstDir,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
};

