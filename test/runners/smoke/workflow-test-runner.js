#!/usr/bin/env node
// test/runners/smoke/workflow-test-runner.js
// Level 4 workflow test runner with block selection support

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  smokeHelpersPath
} = require('@paths');
const logger = require(loggerPath);
const {
  executeCommand,
  executeCommandWithColors,
  TestWorkspace,
  processCommandArgs,
  validateResult,
  parseArgs,
  matchesGrep,
  listTestSuites
} = require(smokeHelpersPath);

// executeCommandWithColors now imported from smoke-helpers

const WORKFLOW_TESTS_FILE = path.join(__dirname, 'workflow-tests.yaml');

async function runTestSuite(testSuite, showMode = false) {
  if (showMode) {
    // Display visual test suite header for show mode
    logger.info('\n' + '─'.repeat(80));
    logger.info(`${testSuite.name}`);
    logger.info('─'.repeat(80));
  } else {
    logger.info({ suiteName: testSuite.name }, { format: 'workflow-suite' });
  }

  // Setup isolated test workspace
  const workspace = new TestWorkspace();
  workspace.setup();

  const results = [];
  let failedScenarios = [];

  for (const scenario of testSuite.scenarios) {
    // Process command arguments with workspace isolation
    const args = processCommandArgs(scenario.args, workspace, true);
    const fullCommand = `node "${cliPath}" ${args}`;
    const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

    if (showMode) {
      // Display scenario header for show mode
      logger.info('\n' + '─'.repeat(60));
      logger.info(`${scenario.description}`);
      logger.info(`Command: ${commandDisplay}`);
      logger.info('─'.repeat(60));
    } else {
      // Start scenario test
      logger.info({ command: commandDisplay, status: 'testing' }, { format: 'smoke-scenario' });
    }

    // Instrumentation: print the command before execution
    logger.debug(`Executing command: ${fullCommand}`, { format: 'workflow-debug' });

    try {
      const result = await (showMode ? executeCommandWithColors(fullCommand) : executeCommand(fullCommand));
      let testPassed = true;
      let failureReason = null;

      // Handle expect_failure cases
      if (scenario.expect && scenario.expect.executes === false) {
        testPassed = false;
        failureReason = 'Expected command to fail but it succeeded';
      } else if (scenario.expect_failure) {
        testPassed = false;
        failureReason = 'Expected command to fail but it succeeded';
      } else {
        // Use harness validation function
        const validation = validateResult(result, scenario.expect, scenario.expect_not);
        testPassed = validation.testPassed;
        failureReason = validation.failureReason;
      }

      if (showMode) {
        // Display the actual output with preserved colors for show mode
        if (result.stdout) {
          // Use raw console.log to preserve ANSI colors
          console.log(result.stdout); // lint-skip-line no-console
        }
        if (result.stderr) {
          logger.warn('\nSTDERR:');
          console.log(result.stderr); // lint-skip-line no-console
        }
      }

      if (testPassed) {
        if (!showMode) {
          logger.info({ command: commandDisplay, status: 'passed' }, { format: 'smoke-scenario' });
        }
      } else {
        logger.info({ command: commandDisplay, status: 'failed', reason: failureReason }, { format: 'smoke-scenario' });
        failedScenarios.push({
          suite: testSuite.name,
          scenario: scenario.description,
          command: commandDisplay,
          reason: failureReason
        });
      }

      results.push({ scenario, success: testPassed, reason: failureReason });

    } catch (error) {
      // Handle expected failures
      if (scenario.expect && scenario.expect.executes === false) {
        // Command was expected to fail
        let testPassed = true;
        let failureReason = null;

        if (scenario.expect_failure) {
          const outputToCheck = error.stdout || error.stderr || error.message;
          const mockResult = { stdout: outputToCheck };
          const validation = validateResult(mockResult, scenario.expect_failure);
          testPassed = validation.testPassed;
          failureReason = validation.failureReason;
        }

        if (testPassed) {
          logger.info({ command: commandDisplay, status: 'passed' }, { format: 'smoke-scenario' });
        } else {
          logger.info({ command: commandDisplay, status: 'failed', reason: failureReason }, { format: 'smoke-scenario' });
          failedScenarios.push({
            suite: testSuite.name,
            scenario: scenario.description,
            command: commandDisplay,
            reason: failureReason
          });
        }

        results.push({ scenario, success: testPassed, reason: failureReason });
      } else {
        // Unexpected failure
        if (showMode) {
          logger.error(`\nFailed to execute: ${error.message}`);
          if (error.stdout) {
            console.log(error.stdout); // lint-skip-line no-console
          }
          if (error.stderr) {
            logger.warn('\nSTDERR:');
            console.log(error.stderr); // lint-skip-line no-console
          }
        } else {
          logger.info({ command: commandDisplay, status: 'failed', reason: error.message }, { format: 'smoke-scenario' });
        }
        failedScenarios.push({
          suite: testSuite.name,
          scenario: scenario.description,
          command: commandDisplay,
          reason: error.message
        });
        results.push({ scenario, success: false, reason: error.message });
      }
    }
  }

  // Clean up workspace after test suite completion
  workspace.teardown();

  return { results, failedScenarios };
}

// listTestSuites now imported from smoke-helpers

async function runWorkflowTests(targetBlock = null, showMode = false, grepPattern = null) {
  const content = fs.readFileSync(WORKFLOW_TESTS_FILE, 'utf8');
  const testSuites = yaml.loadAll(content).filter(doc => doc && doc.name);

  let suitesToRun = testSuites;

  // Apply grep filtering first
  if (grepPattern) {
    suitesToRun = testSuites.filter(suite => matchesGrep(grepPattern, suite));
    if (suitesToRun.length === 0) {
      logger.error(`No test suites match grep pattern "${grepPattern}".`);
      logger.error('Use --list to see available test suites, or try a different pattern.');
      return;
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
        logger.error(`Block "${targetBlock}" not found in ${availableOptions}. Use --list to see available blocks.`);
        return;
      }
    }
  }

  logger.info('', { format: 'workflow-header' });

  let allFailedScenarios = [];

  for (const testSuite of suitesToRun) {
    // eslint-disable-next-line no-unused-vars
    const { results, failedScenarios } = await runTestSuite(testSuite, showMode);
    allFailedScenarios.push(...failedScenarios);
  }

  logger.info({
    suiteCount: suitesToRun.length,
    failedScenarios: allFailedScenarios
  }, { format: 'workflow-results' });
}

// Grep filtering function
// matchesGrep now imported from smoke-helpers

// parseArgs is now imported from smoke-helpers.js

const args = process.argv.slice(2);
const { showMode, listMode, grepPattern, targetBlock } = parseArgs(args);

if (listMode) {
  listTestSuites(WORKFLOW_TESTS_FILE);
} else {
  runWorkflowTests(targetBlock, showMode, grepPattern);
}

