// scripts/linting/lib/lint-helpers.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { minimatch } = require('minimatch');
const {
  fileHelpersPath,
  lintingConfigPath,
  projectRoot,
  loggerPath
} = require('@paths');
const {
  findFiles,
  getPatternsFromArgs,
  getDefaultGlobIgnores
} = require(fileHelpersPath);
const logger = require(loggerPath);

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
    logger.error(`Error loading lint config: ${error.message}`);
    process.exit(1);
  }
}

function findFilesArray(inputs, opts = {}) {
  const { debug = false } = opts; // eslint-disable-line no-unused-vars
  logger.debug(` Received inputs: ${JSON.stringify(inputs)}`, { context: 'LintHelpers' });

  const files = new Set();
  const inputsArray = Array.isArray(inputs) ? inputs : [inputs];

  for (const input of inputsArray) {
    logger.debug(` Processing input: '${input}'`, { context: 'LintHelpers' });
    if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
      logger.debug(` Input '${input}' is a directory, walking it recursively...`, { context: 'LintHelpers' });
      for (const file of findFiles(input, opts)) {
        files.add(file);
      }
    } else {
      logger.debug(` Input '${input}' is being treated as a glob pattern.`, { context: 'LintHelpers' });
      const { glob } = require('glob');
      const matches = glob.sync(input, { nodir: true, ignore: opts.ignores || [], dot: true, absolute: true, cwd: projectRoot });
      logger.debug(` Glob '${input}' matched ${matches.length} files.`, { context: 'LintHelpers' });
      matches.forEach(file => files.add(file));
    }
  }
  const finalFiles = Array.from(files);
  logger.debug(` Finished, returning ${finalFiles.length} unique files.`, { context: 'LintHelpers' });
  return finalFiles;
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
    config: false,
    list: false,
    dryRun: false,
    skip: false,
  };

  let only = null;
  const targets = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) {
      logger.warn(`Encountered null/undefined argument at index ${i}`);
      continue;
    }

    if (arg === '--only') {
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
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        flags[key] = value;
      } else {
        const flagName = arg.replace(/^--/, '');
        flags[flagName] = true;
      }
    } else {
      targets.push(arg);
    }
  }

  logger.debug('Parsed CLI args:', { flags, targets, only });

  return {
    flags,
    targets,
    only
  };
}

function getFirstDir(filepath) {
  if (!filepath) return '';
  return filepath.replace(/^\.?\//, '').split(path.sep)[0];
}

function filterSteps(steps, searchTerm) {
  if (!steps || !Array.isArray(steps)) {
    return [];
  }

  if (!searchTerm) {
    return steps;
  }

  return steps.filter(step => {
    if (!step) return false;

    const key = (step.key || '').toString();
    const label = (step.label || '').toString();
    const search = searchTerm.toString().toLowerCase();

    return key.toLowerCase().includes(search) ||
      label.toLowerCase().includes(search);
  });
}

function getStepInfo(step) {
  if (!step) {
    return {
      key: '',
      label: '',
      valid: false
    };
  }

  return {
    key: step.key || '',
    label: step.label || '',
    valid: true,
    ...step
  };
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
  filterSteps,
  getStepInfo,
};

