// scripts/shared/lint-helpers.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { minimatch } = require('minimatch');
const { findFiles, getPatternsFromArgs, getDefaultGlobIgnores } = require('./file-helpers');
const { lintingConfigPath } = require('@paths');

/**
 * Load a specific section from a YAML config file. Throws if section not found.
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
 * Convert generator to array for convenience.
 */
function findFilesArray(...args) {
  return Array.from(findFiles(...args));
}

/**
 * Check if a file path matches any exclude pattern.
 */
function isExcluded(filePath, patterns) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return patterns.some(pattern => minimatch(relPath, pattern));
}

/**
 * Parse CLI arguments into flags and targets.
 */
function parseCliArgs(args) {
  const flags = {};
  const targets = [];
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      flags[arg.replace(/^--/, '')] = true;
    } else {
      targets.push(arg);
    }
  });
  return { flags, targets };
}

/**
 * Utility: Get the first directory segment from a relative path.
 */
function getFirstDir(filepath) {
  return filepath.replace(/^\.?\//, '').split(path.sep)[0];
}

module.exports = {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
  getFirstDir,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
};

