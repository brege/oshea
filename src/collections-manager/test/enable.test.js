// dev/src/collections-manager/test/enable.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./test-helpers.js');

async function testEnablePlugin(testRunStats) {
    testRunStats.attempted++;
    const testName = "Enable Plugin and Verify Manifest";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-collection';
    const mockPlugin1Id = 'pluginAlpha';
    const mockPlugin2Id = 'pluginBeta';

    const mockPlugin1Path = path.join(testCollRoot, mockCollectionName, mockPlugin1Id);
    const mockPlugin1ConfigFilename = `${mockPlugin1Id}.config.yaml`;
    const mockPlugin1ConfigPath = path.join(mockPlugin1Path, mockPlugin1ConfigFilename);
    await fs.mkdir(mockPlugin1Path, { recursive: true });
    await fs.writeFile(mockPlugin1ConfigPath, yaml.dump({ description: 'Mock Plugin Alpha' }));

    const mockPlugin2Path = path.join(testCollRoot, mockCollectionName, mockPlugin2Id);
    const mockPlugin2ConfigFilename = `${mockPlugin2Id}.yaml`;
    const mockPlugin2ConfigPath = path.join(mockPlugin2Path, mockPlugin2ConfigFilename);
    await fs.mkdir(mockPlugin2Path, { recursive: true });
    await fs.writeFile(mockPlugin2ConfigPath, yaml.dump({ description: 'Mock Plugin Beta (.yaml)' }));

    try {
        const enableResult1 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`);
        assert.ok(enableResult1.success, `(${testName}) Enable pluginAlpha should succeed`);
        // For v0.7.5, we anticipate changing --as to --name, so the option in enablePlugin will be 'name'
        assert.strictEqual(enableResult1.invoke_name, mockPlugin1Id, `(${testName}) Default invoke_name for pluginAlpha is correct`);

        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 1, `(${testName}) One plugin should be enabled`);
        let enabledPlugin1 = manifest.enabled_plugins[0];
        assert.strictEqual(enabledPlugin1.collection_name, mockCollectionName, `(${testName}) pluginAlpha collection_name correct`);
        assert.strictEqual(enabledPlugin1.plugin_id, mockPlugin1Id, `(${testName}) pluginAlpha plugin_id correct`);
        assert.strictEqual(enabledPlugin1.invoke_name, mockPlugin1Id, `(${testName}) pluginAlpha invoke_name correct`);
        assert.strictEqual(enabledPlugin1.config_path, path.resolve(mockPlugin1ConfigPath), `(${testName}) pluginAlpha config_path correct`);
        assert.ok(enabledPlugin1.added_on, `(${testName}) pluginAlpha has an added_on timestamp`);

        const customInvokeName = 'beta-custom';
        // For v0.7.5, this will change from { as: customInvokeName } to { name: customInvokeName }
        const enableResult2 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin2Id}`, { name: customInvokeName });
        assert.ok(enableResult2.success, `(${testName}) Enable pluginBeta with custom name should succeed`);
        assert.strictEqual(enableResult2.invoke_name, customInvokeName, `(${testName}) Custom invoke_name for pluginBeta is correct`);

        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled`);

        enabledPlugin1 = manifest.enabled_plugins.find(p => p.invoke_name === mockPlugin1Id);
        const enabledPlugin2 = manifest.enabled_plugins.find(p => p.invoke_name === customInvokeName);

        assert.ok(enabledPlugin1, `(${testName}) pluginAlpha still present after enabling pluginBeta`);
        assert.ok(enabledPlugin2, `(${testName}) pluginBeta (custom) found in manifest`);
        assert.strictEqual(enabledPlugin2.collection_name, mockCollectionName, `(${testName}) pluginBeta collection_name correct`);
        assert.strictEqual(enabledPlugin2.plugin_id, mockPlugin2Id, `(${testName}) pluginBeta plugin_id correct`);
        assert.strictEqual(enabledPlugin2.config_path, path.resolve(mockPlugin2ConfigPath), `(${testName}) pluginBeta config_path correct`);
        assert.ok(enabledPlugin2.added_on, `(${testName}) pluginBeta has an added_on timestamp`);

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`),
            /Invoke name "pluginAlpha" is already in use/,
            `(${testName}) Should reject enabling with conflicting default invoke_name`
        );

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`, { name: customInvokeName }), // Will be options.name
            new RegExp(`Invoke name "${customInvokeName}" is already in use`),
            `(${testName}) Should reject enabling with conflicting custom invoke_name`
        );

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/nonExistentPlugin`),
            /Plugin "nonExistentPlugin" in collection "test-collection" is not available/,
            `(${testName}) Should reject enabling a non-existent plugin`
        );

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}


async function testEnableAllPluginsInCollection(testRunStats) {
    testRunStats.attempted++;
    const testName = "Enable All Plugins in Collection";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-batch-enable';
    const plugin1Id = 'alphaPlug';
    const plugin2Id = 'bravoPlug';
    const plugin3Id = 'charliePlugInvalid'; // Will have a bad config path

    const collPath = path.join(testCollRoot, mockCollectionName);
    const p1Path = path.join(collPath, plugin1Id);
    const p2Path = path.join(collPath, plugin2Id);
    const p3Path = path.join(collPath, plugin3Id);

    await fs.mkdir(p1Path, { recursive: true });
    await fs.writeFile(path.join(p1Path, `${plugin1Id}.config.yaml`), yaml.dump({ description: 'Alpha Test Plugin' }));
    await fs.mkdir(p2Path, { recursive: true });
    await fs.writeFile(path.join(p2Path, `${plugin2Id}.yaml`), yaml.dump({ description: 'Bravo Test Plugin' }));
    await fs.mkdir(p3Path, { recursive: true });

    try {
        let result = await manager.enableAllPluginsInCollection(mockCollectionName);
        assert.ok(result.success, `(${testName}) Enable all (no prefix) should report overall success if some plugins enable`);
        assert.strictEqual(result.messages.length, 3, `(${testName}) Should have 3 messages (summary + 2 plugins)`);

        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled (alpha, bravo)`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === plugin1Id && p.plugin_id === plugin1Id), `(${testName}) Alpha plug enabled correctly`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === plugin2Id && p.plugin_id === plugin2Id), `(${testName}) Bravo plug enabled correctly`);

        await fs.unlink(enabledManifestPath);

        const prefix = 'test_';
        result = await manager.enableAllPluginsInCollection(mockCollectionName, { prefix });
        assert.ok(result.success, `(${testName}) Enable all (with prefix) should report overall success`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled with prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${prefix}${plugin1Id}`), `(${testName}) Alpha plug enabled with prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${prefix}${plugin2Id}`), `(${testName}) Bravo plug enabled with prefix`);

        await fs.unlink(enabledManifestPath);

        // For v0.7.5, this will be options.name
        await manager.enablePlugin(`${mockCollectionName}/${plugin1Id}`, { name: 'conflictName' }); 
        await manager.disablePlugin('conflictName'); // clean slate
        // For v0.7.5, this will be options.name. Default name is plugin1Id.
        await manager.enablePlugin(`${mockCollectionName}/${plugin1Id}`); 

        result = await manager.enableAllPluginsInCollection(mockCollectionName);
        assert.strictEqual(result.success, false, `(${testName}) Enable all with conflict should report overall failure`);
        assert.ok(result.messages.some(m => m.startsWith(`${plugin1Id}: failed -`) && m.includes(`Invoke name "${plugin1Id}" is already in use.`)), `(${testName}) Conflict message for ${plugin1Id} not correctly reported.`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) alphaPlug (pre-existing) and bravoPlug (newly enabled) should be in manifest`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === plugin1Id), `(${testName}) Original alphaPlug still present`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === plugin2Id), `(${testName}) bravoPlug enabled successfully despite other conflict`);

        await fs.unlink(enabledManifestPath);

        const emptyCollName = 'empty-collection';
        await fs.mkdir(path.join(testCollRoot, emptyCollName), { recursive: true });
        result = await manager.enableAllPluginsInCollection(emptyCollName);
        assert.ok(result.success, `(${testName}) Enable all on empty collection should be successful (no-op)`);
        assert.ok(result.messages.some(m => m.includes('No available plugins found')), `(${testName}) Correct message for empty collection`);
        assert.ok(!fss.existsSync(enabledManifestPath), `(${testName}) Manifest should not be created for empty collection enable all`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}


async function runEnableTests(testRunStats) {
    await testEnablePlugin(testRunStats);
    await testEnableAllPluginsInCollection(testRunStats);
}

module.exports = {
    runEnableTests,
};
