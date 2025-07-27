#!/usr/bin/env node
// test/runners/smoke/smoke-test-runner.js
// Smoke test runner - run tests defined in a YAML file

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yaml = require('js-yaml');
const { cliPath, cliCommandsPath, projectRoot, loggerPath, smokeTestsManifestPath } = require('@paths');
const logger = require(loggerPath);

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

// Expand scenarios with discovery
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

async function runTestSuite(testSuite) {
  logger.info({ suiteName: testSuite.name }, { format: 'smoke-suite' });

  const scenarios = expandScenarios(testSuite);
  const results = [];
  let failedScenarios = [];

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.args}`;
    const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

    // Start scenario test
    logger.info({ command: commandDisplay, status: 'testing' }, { format: 'smoke-scenario' });

    try {
      const result = await executeCommand(fullCommand);

      // Find and run validator
      const expectType = Object.keys(scenario.expect)[0];
      const expectValue = scenario.expect[expectType];
      const validator = validators[expectType];

      if (!validator) {
        throw new Error(`Unknown expect type: ${expectType}`);
      }

      if (validator(expectValue)(result.stdout)) {
        logger.info({ command: commandDisplay, status: 'passed' }, { format: 'smoke-scenario' });
        results.push({ scenario: scenario.description, passed: true });
      } else {
        const failure = {
          command: commandDisplay,
          scenario: scenario.description,
          reason: `Validation failed for expect.${expectType}`
        };
        failedScenarios.push(failure);
        results.push({ scenario: scenario.description, passed: false, failure });
        logger.info({ command: commandDisplay, status: 'failed' }, { format: 'smoke-scenario' });
      }

    } catch (error) {
      const failure = {
        command: commandDisplay,
        scenario: scenario.description,
        reason: error.message.split('\n')[0],
        stderr: error.stderr
      };
      failedScenarios.push(failure);
      results.push({ scenario: scenario.description, passed: false, failure });
      logger.info({ command: commandDisplay, status: 'failed' }, { format: 'smoke-scenario' });
    }
  }

  return {
    suiteName: testSuite.name,
    success: failedScenarios.length === 0,
    results,
    failedCount: failedScenarios.length,
    failedScenarios
  };
}

// Main runner - load YAML and execute all test suites
async function runAllSmokeTests(yamlFile = null) {
  const yamlPath = yamlFile ? path.resolve(__dirname, yamlFile) : smokeTestsManifestPath;
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const testSuites = yaml.loadAll(yamlContent);

  // Display smoke test header
  logger.info('', { format: 'smoke-header' });

  // Run test suites sequentially for clean output
  const allResults = [];

  for (const testSuite of testSuites) {
    const result = await runTestSuite(testSuite);
    allResults.push(result);
  }

  const totalFailed = allResults.reduce((sum, result) => sum + result.failedCount, 0);

  // Display final results using structured data
  logger.info({ 
    allResults, 
    totalFailed 
  }, { format: 'smoke-results' });

  return totalFailed === 0;
}

// CLI execution
if (require.main === module) {
  runAllSmokeTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logger.error('Smoke test runner crashed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runAllSmokeTests,
  runTestSuite,
  validators,
  discoverers
};
