const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'convert' command
createE2eTestRunner('convert', './convert.manifest.js');
/*
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('./harness.js');
const testManifest = require('./convert.manifest.js');

describe('E2E - convert Command', function() {
    this.timeout(15000); // Set a generous timeout for E2E tests involving PDF generation

    testManifest.forEach(testCase => {
        const it_ = testCase.skip ? it.skip : it;

        it_(testCase.describe, async () => {
            const harness = new TestHarness();
            try {
                const sandboxDir = await harness.createSandbox();

                // The setup function will copy necessary fixtures into the sandbox
                if (testCase.setup) {
                    await testCase.setup(sandboxDir, harness);
                }

                // The args function gets the sandboxDir to construct correct paths
                const args = testCase.args(sandboxDir);
                const result = await harness.runCli(args);

                // The assert function performs all checks
                await testCase.assert(result, sandboxDir, expect);
            } finally {
                await harness.cleanup();
            }
        });
    });
});
*/
