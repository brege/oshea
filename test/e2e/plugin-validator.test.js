const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('./harness.js');
const testManifest = require('./plugin-validator.manifest.js');

describe('E2E - Plugin Validator Commands (L2Y4)', function() {
    this.timeout(15000);
    const pluginName = 'e2e-test-plugin';

    testManifest.forEach(testCase => {
        
        it(testCase.describe, async () => {
            const harness = new TestHarness();
            const sandboxDir = await harness.createSandbox();
            const pluginDir = path.join(sandboxDir, pluginName);
            await fs.ensureDir(pluginDir);

            await testCase.setup(pluginDir, pluginName);
            const result = await harness.runCli(testCase.args(pluginDir));
            testCase.assert(result, expect);
            
            await harness.cleanup();
        });

    });
});
