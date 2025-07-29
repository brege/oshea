#!/usr/bin/env node
// test/runners/smoke/smoke-test-runner.js
// Smoke test runner - run tests defined in a YAML file

// lint-skip-file no-console

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  smokeTestsManifestPath
} = require('@paths');
const logger = require(loggerPath);
const {
  executeCommand,
  validators,
  discoverers,
  expandScenarios,
  parseArgs
} = require('./smoke-helpers');

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
        logger.warn({ stderr }, { format: 'smoke-warning' });
      }

      resolve({ stdout, stderr });
    });
  });
}


async function runTestSuite(testSuite, showMode = false) {
  if (showMode) {
    // Display visual test suite header for show mode
    logger.info('\n' + '-'.repeat(80));
    logger.info(`${testSuite.name}`);
    logger.info('-'.repeat(80));
  } else {
    logger.info({ suiteName: testSuite.name }, { format: 'smoke-suite' });
  }

  const scenarios = expandScenarios(testSuite);
  const results = [];
  let failedScenarios = [];

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.args}`;
    const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

    if (showMode) {
      // Display scenario header for show mode
      logger.info('\n' + '-'.repeat(60));
      logger.info(`${scenario.description}`);
      logger.info(`Command: ${commandDisplay}`);
      logger.info('-'.repeat(60));
    } else {
      // Start scenario test
      logger.info({ command: commandDisplay, status: 'testing' }, { format: 'smoke-scenario' });
    }

    try {
      const result = await (showMode ? executeCommandWithColors(fullCommand) : executeCommand(fullCommand));

      if (showMode) {
        // Display the actual output with preserved colors for show mode
        if (result.stdout) {
          console.log(result.stdout); // Use raw console.log to preserve ANSI colors
        }
        if (result.stderr) {
          logger.warn('\nSTDERR:');
          console.log(result.stderr);
        }
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
          logger.info({ command: commandDisplay, status: 'passed' }, { format: 'smoke-scenario' });
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
          logger.info({ command: commandDisplay, status: 'failed' }, { format: 'smoke-scenario' });
        }
      }

    } catch (error) {
      if (showMode) {
        logger.error(`\nFailed to execute: ${error.message}`);
        if (error.stdout) {
          console.log(error.stdout);
        }
        if (error.stderr) {
          logger.warn('\nSTDERR:');
          console.log(error.stderr);
        }
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
        logger.info({ command: commandDisplay, status: 'failed' }, { format: 'smoke-scenario' });
      }
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

// List available test suites for block selection
function listTestSuites(yamlFile = null) {
  const yamlPath = yamlFile ? path.resolve(__dirname, yamlFile) : smokeTestsManifestPath;
  const content = fs.readFileSync(yamlPath, 'utf8');
  const documents = yaml.loadAll(content);

  console.log('\nAvailable smoke test blocks:\n');
  documents.forEach((doc, index) => {
    if (doc && doc.name) {
      console.log(`  ${index + 1}. ${doc.name}`);
      console.log(`     Steps: ${doc.scenarios ? doc.scenarios.length : 0}`);
      
      // Display tags if they exist
      if (doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0) {
        console.log(`     Tags: ${doc.tags.join(', ')}`);
      }
      
      console.log('');
    }
  });
}

// Grep filtering function
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
      console.error(`No test suites match grep pattern "${grepPattern}".`);
      console.error('Use --list to see available test suites, or try a different pattern.');
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
    // Display visual test header for show mode
    logger.info('\n' + '-'.repeat(60));
    logger.info('md-to-pdf CLI Smoke Tests (--show mode)');
    logger.info('-'.repeat(60));
    logger.info('\nPurpose: Visual inspection of CLI commands, outputs, and formatting');
    logger.info('Review each section for: functionality, colors, alignment, error handling');
  } else {
    // Display smoke test header
    logger.info('', { format: 'smoke-header' });
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
  }, { format: 'smoke-results' });

  return totalFailed === 0;
}

// parseArgs is now imported from smoke-helpers.js

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const { showMode, listMode, grepPattern, yamlFile, targetBlock } = parseArgs(args, { supportsYamlFile: true });

  if (listMode) {
    listTestSuites(yamlFile);
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
