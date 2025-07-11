// test/integration/core/math_integration.test.js
const { expect } = require('chai');
const path = require('path');
const { logs, testLogger, clearLogs } = require('../../shared/capture-logs');
const { buildMocks } = require('./math_integration.factory');
const testManifest = require('./math_integration.manifest');

const commonTestConstants = {
  KATEX_CSS_PATH: path.resolve(__dirname, '../../../assets/css/katex.min.css'),
};

describe('math_integration (Module Integration Tests)', function() {
  beforeEach(function() {
    clearLogs();
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(`${testCase.test_id}: ${testCase.description}`, async function() {
      // Build mocks and mathIntegration instance for this scenario
      const mocks = buildMocks(testCase.scenario, testLogger, commonTestConstants);

      // Run assertion, passing logs for logger assertions
      await testCase.assertion(mocks, commonTestConstants, expect, logs);
    });
  });
});

