// test/linting/unit/test-runner-factory.js
const { expect } = require('chai');
const { SmokeTestHarness } = require('./linting-unit-harness');
const proxyquire = require('proxyquire');

function createSmokeTestRunner(suiteName, manifestPath, options = {}) {
  const { timeout = 20000 } = options;
  const testManifest = require(manifestPath);

  describe(`Smoke Tests - ${suiteName}`, function() {
    this.timeout(timeout);

    for (const testCase of testManifest) {
      const testFn = testCase.skip ? it.skip : it;

      testFn(testCase.describe, async () => {
        const harness = new SmokeTestHarness();
        try {
          const sandboxDir = await harness.createSandbox(testCase.sandboxPrefix);

          if (typeof testCase.setup === 'function') {
            await testCase.setup(sandboxDir, harness);
          }

          // Use proxyquire only if proxyStubs is provided.
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

module.exports = { createSmokeTestRunner };

