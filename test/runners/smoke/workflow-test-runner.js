#!/usr/bin/env node
// test/runners/smoke/workflow-test-runner.js
// Level 4 workflow test runner with block selection support

// lint-skip-file no-console

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  projectRoot,
  testHarnessPath
} = require('@paths');
const logger = require(loggerPath);
const {
  executeCommand,
  validators,
  TestWorkspace,
  processCommandArgs,
  validateResult
} = require(testHarnessPath);

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

const WORKFLOW_TESTS_FILE = path.join(__dirname, 'workflow-tests.yaml');

async function runTestSuite(testSuite, showMode = false) {
  if (showMode) {
    // Display visual test suite header for show mode
    logger.info('\n' + '-'.repeat(80));
    logger.info(`${testSuite.name}`);
    logger.info('-'.repeat(80));
  } else {
    logger.info({ suiteName: testSuite.name }, { format: 'smoke-suite' });
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
      logger.info('\n' + '-'.repeat(60));
      logger.info(`${scenario.description}`);
      logger.info(`Command: ${commandDisplay}`);
      logger.info('-'.repeat(60));
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
          console.log(result.stdout); // Use raw console.log to preserve ANSI colors
        }
        if (result.stderr) {
          logger.warn('\nSTDERR:');
          console.log(result.stderr);
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
            console.log(error.stdout);
          }
          if (error.stderr) {
            logger.warn('\nSTDERR:');
            console.log(error.stderr);
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

function listTestSuites() {
  const content = fs.readFileSync(WORKFLOW_TESTS_FILE, 'utf8');
  const documents = yaml.loadAll(content);

  console.log('\nAvailable workflow test blocks:\n');
  documents.forEach((doc, index) => {
    if (doc && doc.name) {
      console.log(`  ${index + 1}. ${doc.name}`);
      console.log(`     Scenarios: ${doc.scenarios ? doc.scenarios.length : 0}`);
      console.log('');
    }
  });
}

async function runWorkflowTests(targetBlock = null, showMode = false) {
  const content = fs.readFileSync(WORKFLOW_TESTS_FILE, 'utf8');
  const testSuites = yaml.loadAll(content).filter(doc => doc && doc.name);

  let suitesToRun = testSuites;

  if (targetBlock) {
    // Find block by name or number
    const blockNum = parseInt(targetBlock);
    if (!isNaN(blockNum) && blockNum > 0 && blockNum <= testSuites.length) {
      suitesToRun = [testSuites[blockNum - 1]];
    } else {
      const foundSuite = testSuites.find(suite =>
        suite.name.toLowerCase().includes(targetBlock.toLowerCase())
      );
      if (foundSuite) {
        suitesToRun = [foundSuite];
      } else {
        console.error(`Block "${targetBlock}" not found. Use --list to see available blocks.`);
        return;
      }
    }
  }

  console.log('============================================================');
  console.log('Level 4 Workflow Tests');
  console.log('============================================================\n');

  let allFailedScenarios = [];

  for (const testSuite of suitesToRun) {
    const { results, failedScenarios } = await runTestSuite(testSuite, showMode);
    allFailedScenarios.push(...failedScenarios);
  }

  if (allFailedScenarios.length > 0) {
    console.log('\n--- Workflow Tests Failed ---');
    console.log(`${allFailedScenarios.length} scenario(s) failed across ${suitesToRun.length} test suite(s):\n`);

    const failuresBySuite = {};
    allFailedScenarios.forEach(failure => {
      if (!failuresBySuite[failure.suite]) {
        failuresBySuite[failure.suite] = [];
      }
      failuresBySuite[failure.suite].push(failure);
    });

    Object.entries(failuresBySuite).forEach(([suiteName, failures]) => {
      console.log(`${suiteName}: ${failures.length} failures`);
      failures.forEach(failure => {
        console.log(`  - ${failure.scenario}`);
        console.log(`    Command: ${failure.command}`);
        console.log(`    Reason: ${failure.reason}`);
      });
      console.log('');
    });

    process.exit(1);
  } else {
    console.log(`\n✓ All workflow tests passed (${suitesToRun.length} test suite(s))`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--list')) {
  listTestSuites();
} else {
  const showMode = args.includes('--show');
  const targetBlock = args.find(arg => !arg.startsWith('--'));
  runWorkflowTests(targetBlock, showMode);
}

