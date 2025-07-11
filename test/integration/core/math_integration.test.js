// test/integration/core/math_integration.test.js
const { expect } = require('chai');
const path = require('path');
const { logs, clearLogs } = require('../../shared/capture-logs');
const { buildMocks } = require('./math_integration.factory');
const testManifest = require('./math_integration.manifest');

const testLoggerPath = path.resolve(__dirname, '../../shared/capture-logs.js');
const commonTestConstants = {
  KATEX_CSS_PATH: path.resolve(__dirname, '../../../assets/css/katex.min.css'),
  TEST_LOGGER_PATH: testLoggerPath
};

describe('math_integration (Module Integration Tests)', function() {
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

