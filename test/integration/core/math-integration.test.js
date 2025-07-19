// test/integration/core/math-integration.test.js
require('module-alias/register');
const {
  mathIntegrationFactoryPath,
  mathIntegrationManifestPath,
  katexPath,
  captureLogsPath
} = require('@paths');
const { expect } = require('chai');
const { logs, clearLogs } = require(captureLogsPath);
const { buildMocks } = require(mathIntegrationFactoryPath);
const testManifest = require(mathIntegrationManifestPath);

const testLoggerPath = captureLogsPath;
const commonTestConstants = {
  KATEX_CSS_PATH: katexPath,
  TEST_LOGGER_PATH: testLoggerPath
};

describe('math-integration (Module Integration Tests)', function() {
  beforeEach(function() {
    clearLogs();
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(`${testCase.test_id}: ${testCase.description}`, async function() {
      // Build mocks and mathIntegration instance for this scenario
      const mocks = buildMocks(testCase.scenario, commonTestConstants);

      // Run assertion, passing logs for logger assertions
      await testCase.assertion(mocks, commonTestConstants, expect, logs);
    });
  });
});

