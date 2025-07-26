// test/e2e/workflow-lifecycle.test.js
require('module-alias/register');
const { e2eHarness, loggerPath, simpleMdFixture } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const { TestHarness } = require(e2eHarness);
const logger = require(loggerPath);

describe('"plugin lifecycles" (Workflow Test) src/plugins/', function() {
  this.timeout(45000); // Allow extra time for git clone and multiple commands

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

    const markdownFixturePath = simpleMdFixture;
    const markdownFilePath = path.join(sandboxDir, 'simple.md');
    await fs.copy(markdownFixturePath, markdownFilePath);

    const collectionUrl = 'https://github.com/brege/md-to-pdf-plugins.git';
    const collectionName = 'lifecycle-collection';
    const pluginRef = `${collectionName}/restaurant-menu`;
    const pluginInvokeName = 'restaurant-menu';

    logger.info('    Step 1: Adding collection...');
    const addResult = await harness.runCli(['collection', 'add', collectionUrl, '--name', collectionName], cliOptions);
    expect(addResult.exitCode, 'collection add should succeed').to.equal(0);
    const collectionPath = path.join(harness.collRootDir, collectionName);
    expect(await fs.pathExists(collectionPath), 'Expected collection directory to be created').to.be.true;

    logger.info('    Step 2: Enabling plugin...');
    const enableResult = await harness.runCli(['plugin', 'enable', pluginRef], cliOptions);
    expect(enableResult.exitCode, 'plugin enable should succeed').to.equal(0);

    logger.info('    Step 3: Converting document with plugin...');
    const convertResult = await harness.runCli(['convert', markdownFilePath, '--plugin', pluginInvokeName, '--outdir', sandboxDir, '--no-open'], cliOptions);
    expect(convertResult.exitCode, 'convert should succeed').to.equal(0);

    const pdfOutputPath = path.join(sandboxDir, 'restaurant-menu.pdf');
    expect(await fs.pathExists(pdfOutputPath), 'Expected PDF file to be created by convert command').to.be.true;

    logger.info('    Step 4: Disabling plugin...');
    const disableResult = await harness.runCli(['plugin', 'disable', pluginInvokeName], cliOptions);
    expect(disableResult.exitCode, 'plugin disable should succeed').to.equal(0);

    logger.info('    Step 5: Removing collection...');
    const removeResult = await harness.runCli(['collection', 'remove', collectionName], cliOptions);
    expect(removeResult.exitCode, 'collection remove should succeed').to.equal(0);
    expect(await fs.pathExists(collectionPath), 'Expected collection directory to be removed').to.be.false;
  });

  it('4.1.2: should archetype a bundled plugin, add it as a new managed plugin, and use it for conversion', async () => {
    const sandboxDir = harness.sandboxDir;
    const cliOptions = { useFactoryDefaults: false };

    const sourcePluginName = 'cv';
    const newArchetypeName = 'my-custom-cv';

    const markdownFixturePath = simpleMdFixture;
    const markdownFilePath = path.join(sandboxDir, 'simple.md');
    await fs.copy(markdownFixturePath, markdownFilePath);

    logger.info(`    Step 1: Creating archetype from bundled plugin '${sourcePluginName}'...`);
    const createResult = await harness.runCli(['plugin', 'create', newArchetypeName, '--from', sourcePluginName, '--target-dir', sandboxDir], cliOptions);
    expect(createResult.exitCode, 'plugin create should succeed').to.equal(0);
    const archetypePath = path.join(sandboxDir, newArchetypeName);
    expect(await fs.pathExists(archetypePath), 'Expected archetype directory to be created in sandbox').to.be.true;

    logger.info('    Step 2: Adding new archetype as managed plugin...');
    const addResult = await harness.runCli(['plugin', 'add', archetypePath], cliOptions);
    expect(addResult.exitCode, 'plugin add should succeed').to.equal(0);
    const singletonPath = path.join(harness.collRootDir, '_user_added_plugins', newArchetypeName);
    expect(await fs.pathExists(singletonPath), 'Expected singleton plugin to exist in collections root').to.be.true;

    logger.info('    Step 3: Converting document with new plugin...');
    const convertResult = await harness.runCli(['convert', markdownFilePath, '--plugin', newArchetypeName, '--outdir', sandboxDir, '--no-open'], cliOptions);
    expect(convertResult.exitCode, 'convert with new archetype should succeed').to.equal(0);
    const pdfOutputPath = path.join(sandboxDir, 'simple.pdf');
    expect(await fs.pathExists(pdfOutputPath), 'Expected PDF file to be created by new archetype plugin').to.be.true;
  });
});

