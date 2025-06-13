// test/e2e/test-runner-factory.js
const { expect } = require('chai');
const { TestHarness } = require('./harness.js');

/**
 * Creates a full E2E test suite for a given command.
 * @param {string} commandName - The name of the command being tested (e.g., 'convert', 'generate').
 * @param {string} manifestPath - The relative path to the test manifest file for this command.
 * @param {object} [options={}] - Optional settings for the test suite.
 * @param {number} [options.timeout=15000] - The timeout for the test suite.
 */
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
