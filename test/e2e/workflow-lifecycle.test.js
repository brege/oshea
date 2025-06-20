// test/e2e/workflow-lifecycle.test.js
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require('./harness.js');
const { createE2eTestRunner } = require('./test-runner-factory.js');

describe('E2E - Full User Workflow (Lifecycle)', function() {
    this.timeout(30000); // Allow extra time for git clone and multiple commands

    let harness;

    beforeEach(async () => {
        harness = new TestHarness();
        await harness.createSandbox();
    });

    afterEach(async () => {
        await harness.cleanup();
    });

    it('4.1.1: should handle the full lifecycle of adding, enabling, using, disabling, and removing a plugin collection', async () => {
        const sandboxDir = harness.sandboxDir;
        const cliOptions = { useFactoryDefaults: false };

        // --- Step 0: Setup a file to convert ---
        const markdownFixturePath = path.resolve(__dirname, '../fixtures/markdown/simple.md');
        const markdownFilePath = path.join(sandboxDir, 'simple.md');
        await fs.copy(markdownFixturePath, markdownFilePath);
        
        const collectionUrl = 'https://github.com/brege/md-to-pdf-plugins.git';
        const collectionName = 'lifecycle-collection';
        const pluginRef = `${collectionName}/restaurant-menu`;
        const pluginInvokeName = 'restaurant-menu';
        
        // --- Step 1: Add a plugin collection ---
        console.log('  [Workflow 4.1.1] Step 1: Adding collection...');
        const addResult = await harness.runCli(['collection', 'add', collectionUrl, '--name', collectionName], cliOptions);
        expect(addResult.exitCode, 'collection add should succeed').to.equal(0);
        const collectionPath = path.join(harness.collRootDir, collectionName);
        const collectionExists = await fs.pathExists(collectionPath);
        expect(collectionExists, 'Expected collection directory to be created').to.be.true;

        // --- Step 2: Enable a plugin from it ---
        console.log('  [Workflow 4.1.1] Step 2: Enabling plugin...');
        const enableResult = await harness.runCli(['plugin', 'enable', pluginRef], cliOptions);
        expect(enableResult.exitCode, 'plugin enable should succeed').to.equal(0);
        expect(enableResult.stdout).to.match(new RegExp(`enabled successfully as "${pluginInvokeName}"`, 'i'));

        // --- Step 3: Use the plugin to convert a document ---
        console.log('  [Workflow 4.1.1] Step 3: Converting document with plugin...');
        const convertResult = await harness.runCli(['convert', markdownFilePath, '--plugin', pluginInvokeName, '--outdir', sandboxDir, '--no-open'], cliOptions);
        expect(convertResult.exitCode, 'convert should succeed').to.equal(0);
        
        // The restaurant-menu plugin's handler logic defaults to naming the output based on the plugin name when no title is in front matter.
        const pdfOutputPath = path.join(sandboxDir, 'restaurant-menu.pdf');
        const pdfExists = await fs.pathExists(pdfOutputPath);
        expect(pdfExists, 'Expected PDF file to be created by convert command').to.be.true;
        
        // --- Step 4: Disable the plugin ---
        console.log('  [Workflow 4.1.1] Step 4: Disabling plugin...');
        const disableResult = await harness.runCli(['plugin', 'disable', pluginInvokeName], cliOptions);
        expect(disableResult.exitCode, 'plugin disable should succeed').to.equal(0);
        expect(disableResult.stdout).to.match(/disabled successfully/i);

        // --- Step 5: Remove the collection ---
        console.log('  [Workflow 4.1.1] Step 5: Removing collection...');
        const removeResult = await harness.runCli(['collection', 'remove', collectionName], cliOptions);
        expect(removeResult.exitCode, 'collection remove should succeed').to.equal(0);
        const collectionStillExists = await fs.pathExists(collectionPath);
        expect(collectionStillExists, 'Expected collection directory to be removed').to.be.false;
    });
});
