// test/integration/core/math-integration.test.js
const { expect } = require('chai');
const path = require('path');
const { logs, clearLogs } = require('../../shared/capture-logs');
const { buildMocks } = require('./math-integration.factory.js');
const testManifest = require('./math-integration.manifest.js');

const testLoggerPath = path.resolve(__dirname, '../../shared/capture-logs.js');
const commonTestConstants = {
  KATEX_CSS_PATH: path.resolve(__dirname, '../../../assets/katex.min.css'),
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

