#!/usr/bin/env node
// test/runners/smoke/yaml-mocha.test.js
// Mocha wrapper around YAML workflow blocks - each block becomes atomic mocha test

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { expect } = require('chai');
const {
  loggerPath,
  yamlTestHelpersPath
} = require('@paths');
const logger = require(loggerPath);
const {
  executeCommand,
  TestWorkspace,
  processCommandArgs,
  createDisplayCommand,
  validateResult
} = require(yamlTestHelpersPath);

const WORKFLOW_TESTS_FILE = path.join(__dirname, 'workflow-tests.yaml');

// Discover all YAML blocks from workflow-tests.yaml
function discoverYamlBlocks() {
  const content = fs.readFileSync(WORKFLOW_TESTS_FILE, 'utf8');
  const testSuites = yaml.loadAll(content).filter(doc => doc && doc.name);
  return testSuites;
}

// Run a single YAML block (test suite)
async function runSingleYamlBlock(testSuite) {
  // Setup isolated test workspace
  const workspace = new TestWorkspace();
  workspace.setup();

  let allScenariosPassed = true;
  const failureReasons = [];

  try {
    for (const scenario of testSuite.scenarios) {
      // Skip scenarios marked with skip: true
      if (scenario.skip) {
        const skipCommandDisplay = createDisplayCommand(
          testSuite.base_command || 'md-to-pdf',
          scenario.args,
          workspace,
          true
        );
        // Resolve test_id with inheritance: scenario.test_id || testSuite.test_id
        const resolvedTestId = scenario.test_id || testSuite.test_id;
        logger.info({
          description: scenario.description,
          command: skipCommandDisplay,
          status: 'skipped',
          test_id: resolvedTestId
        }, { format: 'workflow-step' });
        continue;
      }

      // Process command arguments with workspace isolation
      const args = processCommandArgs(scenario.args, workspace, true);
      const fullCommand = `node "${require('@paths').cliPath}" ${args}`;
      const commandDisplay = createDisplayCommand(
        testSuite.base_command || 'md-to-pdf',
        scenario.args,
        workspace,
        true // This is always a workflow test in Mocha context
      );

      // Resolve test_id with inheritance: scenario.test_id || testSuite.test_id
      const resolvedTestId = scenario.test_id || testSuite.test_id;

      // Real-time step logging using workflow formatter
      logger.info({
        description: scenario.description,
        command: commandDisplay,
        status: 'testing',
        test_id: resolvedTestId
      }, { format: 'workflow-step' });
      try {
        const result = await executeCommand(fullCommand);
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
          const validation = validateResult(result, scenario.expect, scenario.expect_not, workspace);
          testPassed = validation.testPassed;
          failureReason = validation.failureReason;
        }

        if (!testPassed) {
          allScenariosPassed = false;
          failureReasons.push(`${scenario.description}: ${failureReason}`);
          logger.info({
            description: scenario.description,
            command: commandDisplay,
            status: 'failed',
            reason: failureReason,
            test_id: resolvedTestId
          }, { format: 'workflow-step' });
        } else {
          logger.info({
            description: scenario.description,
            command: commandDisplay,
            status: 'passed',
            test_id: resolvedTestId
          }, { format: 'workflow-step' });
        }

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

          if (!testPassed) {
            allScenariosPassed = false;
            failureReasons.push(`${scenario.description}: ${failureReason}`);
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'failed',
              reason: failureReason,
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
          } else {
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'passed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
          }
        } else {
          // Unexpected failure
          allScenariosPassed = false;
          failureReasons.push(`${scenario.description}: ${error.message}`);
          logger.info({
            description: scenario.description,
            command: commandDisplay,
            status: 'failed',
            reason: error.message,
            test_id: resolvedTestId
          }, { format: 'workflow-step' });
        }
      }
    }
  } finally {
    // Clean up workspace after test suite completion
    workspace.teardown();
  }

  return {
    success: allScenariosPassed,
    failureReasons
  };
}

// Generate mocha tests dynamically
describe('Workflow Tests (YAML-driven)', function() {
  // Increase timeout for workflow tests that involve multiple commands
  this.timeout(30000);

  const yamlBlocks = discoverYamlBlocks();

  yamlBlocks.forEach(testSuite => {
    // Use test_id field for cleaner Mocha output
    const testName = testSuite.test_id
      ? `[${testSuite.test_id}] ${testSuite.name}`
      : testSuite.name;

    // Support block-level skipping with it.skip()
    const testFunction = testSuite.skip ? it.skip : it;

    testFunction(testName, async function() {
      const result = await runSingleYamlBlock(testSuite);

      if (!result.success) {
        const errorMessage = `Workflow block failed:\n${result.failureReasons.join('\n')}`;
        throw new Error(errorMessage);
      }

      // If we get here, all scenarios in the block passed
      expect(result.success).to.be.true;
    });
  });
});
