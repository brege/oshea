// test/e2e/test-runner-factory.js
require('module-alias/register');
const { e2eHarness } = require('@paths');
const { expect } = require('chai');
const { TestHarness } = require(e2eHarness);


function createE2eTestRunner(commandName, manifestPath, options = {}) {
  const { timeout = 15000 } = options;
  const testManifest = require(manifestPath);

  describe(`E2E - ${commandName} Command`, function() {
    this.timeout(timeout);

    testManifest.forEach(testCase => {
      const it_ = testCase.skip ? it.skip : it;

      it_(testCase.describe, async () => {
        const harness = new TestHarness();
        try {
          const sandboxDir = await harness.createSandbox();

          if (testCase.setup) {
            await testCase.setup(sandboxDir, harness);
          }

          const args = testCase.args(sandboxDir);
          // Pass options to runCli, allowing test case to override defaults
          const cliOptions = { useFactoryDefaults: testCase.useFactoryDefaults !== false };
          const result = await harness.runCli(args, cliOptions);

          await testCase.assert(result, sandboxDir, expect);
        } finally {
          await harness.cleanup();
        }
      });
    });
  });
}

module.exports = { createE2eTestRunner };
