// test/e2e/plugin-validator.test.js
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('./harness.js');
const testManifest = require('./plugin-validator.manifest.js');

describe('E2E - Plugin Validator Commands (L2Y4)', function() {
    this.timeout(15000);
    const pluginName = 'e2e-test-plugin';

    testManifest.forEach(testCase => {
        // Respect the 'skip' property in the manifest
        const it_ = testCase.skip ? it.skip : it;

        it_(testCase.describe, async () => {
            const harness = new TestHarness();
            const sandboxDir = await harness.createSandbox();
            const pluginDir = path.join(sandboxDir, pluginName);
            await fs.ensureDir(pluginDir);

            // The setup function might need the harness to run prerequisite commands
            await testCase.setup(pluginDir, pluginName, harness);
            const result = await harness.runCli(testCase.args(pluginDir, pluginName));
            testCase.assert(result, expect);

            await harness.cleanup();
        });

    });
});
