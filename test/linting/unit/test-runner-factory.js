// test/linting/unit/test-runner-factory.js
require('module-alias/register');

const { expect } = require('chai');
const { lintingUnitHarnessPath } = require('@paths');
const { UnitTestHarness } = require(lintingUnitHarnessPath);
const proxyquire = require('proxyquire');

function createUnitTestRunner(suiteName, manifestPath, options = {}) {
  const { timeout = 20000 } = options;
  const testManifest = require(manifestPath);

  describe(`Unit Tests - ${suiteName}`, function() {
    this.timeout(timeout);

    for (const testCase of testManifest) {
      const testFn = testCase.skip ? it.skip : it;

      testFn(testCase.describe, async () => {
        const harness = new UnitTestHarness();
        try {
          const sandboxDir = await harness.createSandbox(testCase.sandboxPrefix);

          if (typeof testCase.setup === 'function') {
            await testCase.setup(sandboxDir, harness);
          }

          if (testCase.proxyStubs) {
            proxyquire(testCase.scriptPath, testCase.proxyStubs);
          }

          const result = await harness.runScript(
            testCase.scriptPath,
            testCase.args(sandboxDir),
            sandboxDir
          );

          await testCase.assert(result, sandboxDir, expect);
        } finally {
          await harness.cleanup();
        }
      });
    }
  });
}

module.exports = { createUnitTestRunner };

