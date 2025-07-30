// test/runners/smoke/smoke-helpers.js
// Unified test harness for YAML-based tests (smoke tests and workflow tests)

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yaml = require('js-yaml');
const {
  cliCommandsPath,
  projectRoot,
  loggerPath,
  simpleMdFixture,
  colorThemePath
} = require('@paths');
const logger = require(loggerPath);
const { theme } = require(colorThemePath);


// Execute a shell command and return promise with result
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr, message: error.message });
        return;
      }

      if (stderr && stderr.trim()) {
        logger.warn({ stderr }, { format: 'smoke-warning' });
      }

      resolve({ stdout, stderr });
    });
  });
}


// Validation functions for different expect types
const validators = {
  contains: (text) => (stdout) => stdout.includes(text),

  contains_all: (textArray) => (stdout) =>
    textArray.every(text => stdout.includes(text)),

  contains_any: (textArray) => (stdout) =>
    textArray.some(text => stdout.includes(text)),

  yaml_has_key: (key) => (stdout) => {
    try {
      const doc = yaml.load(stdout);
      return typeof doc === 'object' && doc !== null && key in doc;
    } catch (e) {
      return false;
    }
  },

  executes: () => () => true,

  matches_regex: (pattern) => (stdout) => new RegExp(pattern).test(stdout)
};


// Discovery functions for dynamic scenario generation
const discoverers = {
  cli_commands: (config) => {
    function parseBaseCommand(commandDef) {
      const cmdString = Array.isArray(commandDef) ? commandDef[0] : commandDef;
      return cmdString.split(' ')[0];
    }

    function discoverCommands(dir, prefixParts = []) {
      let commands = [];
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          const groupName = path.basename(fullPath);
          commands.push([...prefixParts, groupName]);
          commands.push(...discoverCommands(fullPath, [...prefixParts, groupName]));
        } else if (entry.endsWith('.command.js')) {
          const commandModule = require(fullPath);
          if (!commandModule.command) continue;

          let commandDefinition = commandModule.command;
          if (commandModule.explicitConvert && commandModule.explicitConvert.command) {
            commandDefinition = commandModule.explicitConvert.command;
          }

          const commandName = parseBaseCommand(commandDefinition);
          if (config.exclude && config.exclude.includes(commandName)) {
            continue;
          }
          commands.push([...prefixParts, commandName]);
        }
      }
      return commands;
    }

    const commandPartsList = discoverCommands(cliCommandsPath);
    commandPartsList.push([]);

    return Array.from(new Set(commandPartsList.map(p => p.join(' ')))).sort();
  },

  directory_scan: (config) => {
    const scanPath = path.resolve(projectRoot, config.source);
    return fs.readdirSync(scanPath, { withFileTypes: true })
      .filter(dirent => {
        if (config.filter === 'directories') return dirent.isDirectory();
        if (config.filter === 'files') return dirent.isFile();
        return true;
      })
      .map(dirent => dirent.name)
      .sort();
  }
};


// Test workspace manager for isolated tes/t environments
class TestWorkspace {
  constructor(basePath = '/tmp/md-to-pdf-workspace') {
    this.basePath = basePath;
    this.outdir = path.join(basePath, 'outdir');
    this.collRoot = path.join(basePath, 'coll-root');
  }


  // Create clean workspace directories
  setup() {
    for (const dir of [this.outdir, this.collRoot]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    }

    logger.debug(`Test workspace setup: OUTDIR=${this.outdir}, COLL_ROOT=${this.collRoot}`, { format: 'workflow-debug' });
  }


  // Clean up workspace directories
  teardown() {
    if (fs.existsSync(this.basePath)) {
      fs.rmSync(this.basePath, { recursive: true, force: true });
    }
  }


  // Get environment variables for command execution
  getEnvVars() {
    return {
      OUTDIR: this.outdir,
      COLL_ROOT: this.collRoot,
      SIMPLE_MD_FIXTURE: simpleMdFixture
    };
  }
}


// Expand scenarios with discovery for dynamic test generation
function expandScenarios(testSuite) {
  if (!testSuite.discovery) {
    return testSuite.scenarios;
  }

  const discoverer = discoverers[testSuite.discovery.type];
  if (!discoverer) {
    throw new Error(`Unknown discovery type: ${testSuite.discovery.type}`);
  }

  const items = discoverer(testSuite.discovery);
  const expandedScenarios = [];

  for (const item of items) {
    for (const scenarioTemplate of testSuite.scenarios) {
      const scenario = {
        description: scenarioTemplate.description.replace('{command}', item).replace('{item}', item),
        args: scenarioTemplate.args.replace('{command}', item).replace('{item}', item),
        expect: scenarioTemplate.expect
      };
      expandedScenarios.push(scenario);
    }
  }

  return expandedScenarios;
}


// Process command arguments with variable substitution and workspace isolation
function processCommandArgs(args, workspace, isWorkflowTest = false) {
  // Replace workspace variables
  let processedArgs = args
    .replace(/\$\{OUTDIR\}/g, workspace.outdir)
    .replace(/\$\{COLL_ROOT\}/g, workspace.collRoot)
    .replace(/\$\{SIMPLE_MD_FIXTURE\}/g, simpleMdFixture);

  if (isWorkflowTest) {
    // For workflow tests, ensure --outdir and --coll-root are properly set
    if (processedArgs.includes('plugin create')) {
      if (/--outdir\s+\S+/.test(processedArgs)) {
        processedArgs = processedArgs.replace(/--outdir\s+\S+/g, `--outdir "${workspace.outdir}"`);
      } else {
        processedArgs += ` --outdir "${workspace.outdir}"`;
      }
    }

    // Append --coll-root unless already present
    if (!/--coll-root\s+\S+/.test(processedArgs)) {
      processedArgs += ` --coll-root "${workspace.collRoot}"`;
    }
  }

  return processedArgs;
}


// Validate test result against expected criteria
function validateResult(result, expectCriteria, expectNotCriteria = null) {
  let testPassed = true;
  let failureReason = null;

  // Check normal expectations
  if (expectCriteria) {
    for (const [expectType, expectValue] of Object.entries(expectCriteria)) {
      if (expectType === 'executes') continue;

      const validator = validators[expectType];
      if (validator && !validator(expectValue)(result.stdout)) {
        testPassed = false;
        failureReason = `Validation failed for expect.${expectType}`;
        break;
      }
    }
  }

  // Check negative expectations
  if (expectNotCriteria && testPassed) {
    for (const [expectType, expectValue] of Object.entries(expectNotCriteria)) {
      const validator = validators[expectType];
      if (validator && validator(expectValue)(result.stdout)) {
        testPassed = false;
        failureReason = `Validation failed for expect_not.${expectType}`;
        break;
      }
    }
  }

  return { testPassed, failureReason };
}

// Shared argument parsing for smoke and workflow test runners
function parseArgs(args, options = {}) {
  const {
    supportsYamlFile = false  // Only smoke-test-runner supports yamlFile
  } = options;

  const result = {
    showMode: false,
    listMode: false,
    grepPattern: null,
    targetBlock: null
  };

  // Add yamlFile support if requested
  if (supportsYamlFile) {
    result.yamlFile = null;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--list') {
      result.listMode = true;
    } else if (arg === '--show') {
      result.showMode = true;
    } else if (arg === '--grep') {
      if (i + 1 < args.length) {
        result.grepPattern = args[i + 1];
        i++; // Skip next arg since it's the grep pattern
      } else {
        logger.error('Error: --grep requires a pattern argument');
        process.exit(1);
      }
    } else if (!arg.startsWith('--')) {
      if (supportsYamlFile && arg.endsWith('.yaml')) {
        result.yamlFile = arg;
      } else {
        result.targetBlock = arg;
      }
    }
  }

  return result;
}

// Enhanced command execution that preserves colors for --show mode
function executeCommandWithColors(command) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(command, {
      env: { ...process.env, FORCE_COLOR: '1' }, // Ensure colors are preserved
      maxBuffer: 1024 * 1024 // 1MB buffer for large outputs
    }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr, message: error.message });
        return;
      }

      if (stderr && stderr.trim()) {
        logger.warn({ stderr }, { format: 'workflow-warning' });
      }

      resolve({ stdout, stderr });
    });
  });
}

// Grep filtering function - matches against suite name, tags, and scenario descriptions
function matchesGrep(grepPattern, testSuite) {
  if (!grepPattern) return true;

  const lowerPattern = grepPattern.toLowerCase();

  // Match against suite name
  if (testSuite.name && testSuite.name.toLowerCase().includes(lowerPattern)) {
    return true;
  }

  // Match against tags
  if (testSuite.tags && Array.isArray(testSuite.tags)) {
    if (testSuite.tags.some(tag => tag.toLowerCase().includes(lowerPattern))) {
      return true;
    }
  }

  // Match against scenario descriptions (from expanded scenarios)
  const scenarios = expandScenarios(testSuite);
  if (scenarios.some(scenario =>
    scenario.description && scenario.description.toLowerCase().includes(lowerPattern)
  )) {
    return true;
  }

  return false;
}

// Unified list function that works with both smoke and workflow tests
function listTestSuites(yamlFilePath, useWorkflowFormatter = true) {
  const content = fs.readFileSync(yamlFilePath, 'utf8');
  const documents = yaml.loadAll(content);

  const blocks = documents
    .filter(doc => doc && doc.name)
    .map((doc, index) => ({
      index: index + 1,
      name: doc.name,
      stepCount: doc.scenarios ? doc.scenarios.length : 0,
      tags: doc.tags || []
    }));

  if (useWorkflowFormatter) {
    logger.info({ blocks }, { format: 'workflow-list' });
  } else {
    // Legacy console output for backward compatibility
    console.log('\nAvailable test blocks:\n');
    blocks.forEach(block => {
      console.log(`  ${block.index}. ${block.name}`);
      console.log(`     Steps: ${block.stepCount}`);
      if (block.tags.length > 0) {
        console.log(`     Tags: ${block.tags.join(', ')}`);
      }
      console.log('');
    });
  }
}

// ShowMode formatters - clean visual inspection mode with minimal headers
const showModeFormatters = {
  // Display session header once (Level 3/4 Tests)
  showSessionHeader: (title) => {
    console.log(''); // spacing
    console.log('─'.repeat(60));
    console.log(title);
    console.log('─'.repeat(60));
  },

  // Display test suite name with minimal separator
  showSuiteHeader: (suiteName) => {
    console.log(suiteName);
    console.log('─'.repeat(38)); // shorter separator
  },

  // Display scenario with grey command
  showScenario: (description, commandDisplay) => {
    console.log(description);
    // Use theme.detail for grey command styling
    console.log(`Command: ${theme.detail(commandDisplay)}`);
    console.log(''); // spacing before output
  },

  // Display separator between scenarios
  showScenarioSeparator: () => {
    console.log('─'.repeat(38));
  },

  // Display command output with preserved colors (no extra formatting)
  showOutput: (result) => {
    if (result.stdout) {
      console.log(result.stdout); // lint-skip-line no-console
    }
    if (result.stderr) {
      logger.warn('\nSTDERR:');
      console.log(result.stderr); // lint-skip-line no-console
    }
  },

  // Display error information cleanly
  showError: (error) => {
    logger.error(`Failed to execute: ${error.message}`);
    if (error.stdout) {
      console.log(error.stdout); // lint-skip-line no-console
    }
    if (error.stderr) {
      logger.warn('STDERR:');
      console.log(error.stderr); // lint-skip-line no-console
    }
  }
};

module.exports = {
  executeCommand,
  executeCommandWithColors,
  validators,
  discoverers,
  TestWorkspace,
  expandScenarios,
  processCommandArgs,
  validateResult,
  parseArgs,
  matchesGrep,
  listTestSuites,
  showModeFormatters
};
