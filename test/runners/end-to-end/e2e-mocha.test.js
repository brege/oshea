#!/usr/bin/env node
// test/runners/end-to-end/e2e-mocha.test.js
// Mocha wrapper around YAML tests - each test_id becomes atomic mocha test

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { expect } = require('chai');
const {
  fileHelpersPath,
  e2eTestDir,
  e2eHelpersPath,
  e2eRunnerPath,
} = require('@paths');

const { findFilesArray } = require(fileHelpersPath);
const { YamlTestRunner } = require(e2eRunnerPath);
const { expandScenarios } = require(e2eHelpersPath);

// Discover all test_ids from all manifest YAML files
function discoverAllTestIds() {
  // Find all manifest files
  const yamlFiles = findFilesArray(
    [path.join(e2eTestDir, '**/*.manifest.yaml')],
    {
      filter: (name) => name.endsWith('.yaml'),
    },
  );

  const testCases = [];
  const debugMode =
    process.env.OSHEA_DEBUG === 'true' || process.env.DEBUG === 'true';

  for (const yamlFile of yamlFiles) {
    const content = fs.readFileSync(yamlFile, 'utf8');
    const testSuites = yaml.loadAll(content).filter((doc) => doc && doc.name);

    for (const suite of testSuites) {
      // Skip entire test suite if marked with skip: true
      if (suite.skip) {
        continue;
      }

      if (suite.workflow === false) {
        // Each scenario becomes a separate mocha test
        const scenarios = expandScenarios(suite);
        for (const scenario of scenarios) {
          // Skip debug scenarios unless debug mode is enabled
          if (scenario.debug && !debugMode) {
            continue;
          }

          // Skip scenarios marked with skip: true
          if (scenario.skip) {
            continue;
          }

          testCases.push({
            testId:
              scenario.test_id ||
              `${suite.name}-scenario-${scenarios.indexOf(scenario)}`,
            description: scenario.description,
            yamlFile: yamlFile,
            type: 'scenario',
            suiteName: suite.name,
            skip: false,
          });
        }
      } else {
        // Default: entire suite becomes one mocha test
        const scenarios = expandScenarios(suite);
        // Find the last non-debug scenario as the main test description
        const nonDebugScenarios = scenarios.filter((s) => !s.debug);
        const lastMeaningfulScenario =
          nonDebugScenarios[nonDebugScenarios.length - 1];
        const testDescription = lastMeaningfulScenario
          ? lastMeaningfulScenario.description
          : 'workflow test';

        testCases.push({
          testId: suite.test_id || suite.name,
          description: suite.name,
          testDescription: testDescription,
          yamlFile: yamlFile,
          type: 'suite',
          suiteName: suite.name,
          skip: suite.skip || false,
        });
      }
    }
  }

  return testCases;
}

// Run a single test in complete isolation
async function runSingleTestById(testCase) {
  // Create unique workspace path using PID, timestamp, and test ID to prevent race conditions
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  const safeTestId = testCase.testId.toString().replace(/[^a-zA-Z0-9]/g, '-');
  const uniqueSuffix = `${process.pid}-${timestamp}-${randomId}-${safeTestId}`;
  const uniqueWorkspacePath = `/tmp/oshea-test-${uniqueSuffix}`;

  const runner = new YamlTestRunner(testCase.yamlFile, {
    apiMode: true,
    basePath: uniqueWorkspacePath,
    debug: process.env.OSHEA_DEBUG === 'true',
  });

  try {
    const result = await runner.runAllTests(false, null, null, testCase.testId);

    if (!result.success) {
      const failureDetails = (result.allFailedScenarios || [])
        .map((f) => `${f.scenario}: ${f.reason}`)
        .join('\n');

      const errorMessage =
        failureDetails || 'Test failed with no specific details';
      throw new Error(`Test ID ${testCase.testId} failed:\n${errorMessage}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Test ID ${testCase.testId} crashed: ${error.message}`, {
      cause: error,
    });
  }
}

// Generate atomic mocha tests grouped by suite name
describe('End-to-End Tests (Mocha Runner)', function () {
  // Increase timeout for tests that involve workspace setup and command execution
  this.timeout(30000);

  const testCases = discoverAllTestIds();

  // Group test cases by suite name to create nested describe blocks
  const suiteGroups = {};
  testCases.forEach((testCase) => {
    const suiteName = testCase.suiteName || testCase.description;
    if (!suiteGroups[suiteName]) {
      suiteGroups[suiteName] = [];
    }
    suiteGroups[suiteName].push(testCase);
  });

  // Create a describe block for each suite name
  Object.entries(suiteGroups).forEach(([suiteName, cases]) => {
    describe(suiteName, () => {
      cases.forEach((testCase) => {
        // Create descriptive test name matching standard mocha format
        const testName =
          testCase.type === 'scenario'
            ? `${testCase.testId}: ${testCase.description}`
            : `${testCase.testId}: ${testCase.testDescription}`;

        const testFn = testCase.skip ? it.skip : it;

        testFn(testName, async () => {
          // Add small staggered delay to reduce race conditions in workspace setup
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100),
          );

          const result = await runSingleTestById(testCase);

          // Verify test passed
          expect(result.success).to.be.true;
          expect(result.totalFailed).to.equal(0);
        });
      });
    });
  });
});
