// scripts/shared/lint-helpers.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { minimatch } = require('minimatch');
const { findFiles, getPatternsFromArgs, getDefaultGlobIgnores } = require('./file-helpers');
const { lintingConfigPath } = require('@paths');

function loadLintSection(section, configPath = lintingConfigPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);
  if (!config[section]) {
    throw new Error(`Section '${section}' not found in ${configPath}`);
  }
  return config[section];
}

function loadLintConfig(configPath = lintingConfigPath) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent);
  } catch (error) {
    console.error('Error loading lint config:', error.message);
    process.exit(1);
  }
}

function findFilesArray(...args) {
  return Array.from(findFiles(...args));
}

function isExcluded(filePath, patterns) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return patterns.some(pattern => minimatch(relPath, pattern));
}

function parseCliArgs(args) {
  const flags = {
    fix: false,
    quiet: false,
    json: false,
    debug: false,
    force: false,
  };

  const targets = [];

  for (const arg of args) {
    if (arg === '--fix') flags.fix = true;
    else if (arg === '--quiet') flags.quiet = true;
    else if (arg === '--json') flags.json = true;
    else if (arg === '--debug') flags.debug = true;
    else if (arg === '--force') flags.force = true;
    else if (arg.startsWith('--')) {
      const flagName = arg.replace(/^--/, '');
      flags[flagName] = true;
    } else {
      targets.push(arg);
    }
  }

  return { flags, targets };
}

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

