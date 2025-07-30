#!/usr/bin/env node
// test/runners/smoke/smoke-test-runner.js
// Smoke test runner - run tests defined in a YAML file

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  smokeHelpersPath,
  smokeTestsManifestPath
} = require('@paths');
const logger = require(loggerPath);
const {
  executeCommand,
  executeCommandWithColors,
  validators,
  discoverers,
  expandScenarios,
  parseArgs,
  matchesGrep,
  listTestSuites,
  showModeFormatters
} = require(smokeHelpersPath);

// executeCommandWithColors now imported from smoke-helpers


async function runTestSuite(testSuite, showMode = false) {
  if (showMode) {
    showModeFormatters.showSuiteHeader(testSuite.name);
  } else {
    logger.info({ suiteName: testSuite.name }, { format: 'workflow-suite' });
  }

  const scenarios = expandScenarios(testSuite);
  const results = [];
  let failedScenarios = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const fullCommand = `node "${cliPath}" ${scenario.args}`;
    const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

    if (showMode) {
      showModeFormatters.showScenario(scenario.description, commandDisplay);
    } else {
      // Start scenario test
      logger.info({ command: commandDisplay, status: 'testing' }, { format: 'workflow-step' });
    }

    try {
      const result = await (showMode ? executeCommandWithColors(fullCommand) : executeCommand(fullCommand));

      if (showMode) {
        showModeFormatters.showOutput(result);
      }

      // Find and run validator
      const expectType = Object.keys(scenario.expect)[0];
      const expectValue = scenario.expect[expectType];
      const validator = validators[expectType];

      if (!validator) {
        throw new Error(`Unknown expect type: ${expectType}`);
      }

      if (validator(expectValue)(result.stdout)) {
        if (!showMode) {
          logger.info({ command: commandDisplay, status: 'passed' }, { format: 'workflow-step' });
        }
        results.push({ scenario: scenario.description, passed: true });
      } else {
        const failure = {
          command: commandDisplay,
          scenario: scenario.description,
          reason: `Validation failed for expect.${expectType}`
        };
        failedScenarios.push(failure);
        results.push({ scenario: scenario.description, passed: false, failure });
        if (!showMode) {
          logger.info({ command: commandDisplay, status: 'failed' }, { format: 'workflow-step' });
        }
      }

    } catch (error) {
      if (showMode) {
        showModeFormatters.showError(error);
      }

      const failure = {
        command: commandDisplay,
        scenario: scenario.description,
        reason: error.message.split('\n')[0],
        stderr: error.stderr
      };
      failedScenarios.push(failure);
      results.push({ scenario: scenario.description, passed: false, failure });
      if (!showMode) {
        logger.info({ command: commandDisplay, status: 'failed' }, { format: 'workflow-step' });
      }
    }

    // Add separator between scenarios in showMode (but not after the last one)
    if (showMode && i < scenarios.length - 1) {
      showModeFormatters.showScenarioSeparator();
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

// listTestSuites now imported from smoke-helpers

// matchesGrep now imported from smoke-helpers

// Main runner - load YAML and execute all test suites
async function runAllSmokeTests(yamlFile = null, showMode = false, targetBlock = null, grepPattern = null) {
  const yamlPath = yamlFile ? path.resolve(__dirname, yamlFile) : smokeTestsManifestPath;
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const testSuites = yaml.loadAll(yamlContent).filter(doc => doc && doc.name);

  let suitesToRun = testSuites;

  // Apply grep filtering first
  if (grepPattern) {
    suitesToRun = testSuites.filter(suite => matchesGrep(grepPattern, suite));
    if (suitesToRun.length === 0) {
      logger.error(`No test suites match grep pattern "${grepPattern}".`);
      logger.error('Use --list to see available test suites, or try a different pattern.');
      return false;
    }
  }

  // Then apply target block filtering
  if (targetBlock) {
    // Find block by name or number
    const blockNum = parseInt(targetBlock);
    if (!isNaN(blockNum) && blockNum > 0 && blockNum <= suitesToRun.length) {
      suitesToRun = [suitesToRun[blockNum - 1]];
    } else {
      const foundSuite = suitesToRun.find(suite =>
        suite.name.toLowerCase().includes(targetBlock.toLowerCase())
      );
      if (foundSuite) {
        suitesToRun = [foundSuite];
      } else {
        const availableOptions = grepPattern ?
          `grep-filtered results (${suitesToRun.length} suites)` :
          'available blocks';
        console.error(`Block "${targetBlock}" not found in ${availableOptions}. Use --list to see available blocks.`);
        return false;
      }
    }
  }

  if (showMode) {
    showModeFormatters.showSessionHeader('Level 3 CLI Smoke Tests');
  } else {
    // Display smoke test header
    logger.info('', { format: 'workflow-header' });
  }

  // Run test suites sequentially for clean output
  const allResults = [];

  for (const testSuite of suitesToRun) {
    const result = await runTestSuite(testSuite, showMode);
    allResults.push(result);
  }

  const totalFailed = allResults.reduce((sum, result) => sum + result.failedCount, 0);

  // Display final results using structured data
  logger.info({
    allResults,
    totalFailed
  }, { format: 'workflow-results' });

  return totalFailed === 0;
}

// parseArgs is now imported from smoke-helpers.js

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const { showMode, listMode, grepPattern, yamlFile, targetBlock } = parseArgs(args, { supportsYamlFile: true });

  if (listMode) {
    const yamlPath = yamlFile ? path.resolve(__dirname, yamlFile) : smokeTestsManifestPath;
    listTestSuites(yamlPath);
  } else {
    runAllSmokeTests(yamlFile, showMode, targetBlock, grepPattern).then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      logger.error('Smoke test runner crashed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = {
  runAllSmokeTests,
  runTestSuite,
  validators,
  discoverers
};
