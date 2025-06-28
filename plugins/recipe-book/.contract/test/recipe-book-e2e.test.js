// plugins/recipe-book/.contract/test/recipe-book-e2e.test.js
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('../../../../test/e2e/harness');
const {
    checkFileExists,
    checkFile,
    readFileContent,
} = require('../../../../test/shared/test-helpers');

describe('Recipe Book Plugin E2E Test (Generate Command)', function () {
    this.timeout(20000);

    let harness;
    const hugoExamplePath = path.resolve(__dirname, '../../../../test/fixtures/hugo-example'); 

    beforeEach(async () => {
        harness = new TestHarness();
        await harness.createSandbox();
        // Copy the hugo-example fixture into the sandbox for the test run
        const fixtureDest = path.join(harness.sandboxDir, 'hugo-example-src');
        await fs.copy(hugoExamplePath, fixtureDest);
    });

    afterEach(async () => {
        await harness.cleanup();
    });

    it('should generate a PDF book from Hugo examples using the recipe-book plugin and produce a non-empty PDF', async () => {
        const sandboxDir = harness.sandboxDir;
        const cliArgs = [
            'generate',
            'recipe-book',
            '--recipes-base-dir',
            path.join(sandboxDir, 'hugo-example-src'),
            '--outdir',
            sandboxDir,
            '--filename',
            'hugo-recipe-book.pdf',
            '--no-open',
        ];

        const result = await harness.runCli(cliArgs, { useFactoryDefaults: false });

        if (result.exitCode !== 0) {
            throw new Error(`CLI command failed: ${result.stderr || result.stdout}`);
        }

        expect(result.exitCode).to.equal(0);
        await checkFile(sandboxDir, 'hugo-recipe-book.pdf', 20000); // Check for a substantial file size
    });
});
