// use test-runner-factory.js
const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'generate' command, with a custom timeout
createE2eTestRunner('generate', './generate.manifest.js', { timeout: 10000 });

/*
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('./harness.js');
const testManifest = require('./generate.manifest.js');

describe('E2E - generate Command', function() {
    this.timeout(20000); // Higher timeout for generate which can be complex

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
                const result = await harness.runCli(args);

                await testCase.assert(result, sandboxDir, expect);
            } finally {
                await harness.cleanup();
            }
        });
    });
});
*/
