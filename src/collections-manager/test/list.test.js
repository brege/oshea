// dev/src/collections-manager/test/list.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./test-helpers.js');

async function testListCollections(testRunStats) {
    testRunStats.attempted++;
    const testName = "List Downloaded Collections";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });
    const localSourceListName = `cm_local_source_list_test_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceListName);
    await fs.mkdir(localSourcePath, { recursive: true });
    const dummyPluginIdInList = "dummy-plugin-for-list";
    await fs.mkdir(path.join(localSourcePath, dummyPluginIdInList), { recursive: true });
    await fs.writeFile(path.join(localSourcePath, dummyPluginIdInList, `${dummyPluginIdInList}.config.yaml`), 'description: dummy');

    await manager.addCollection('https://github.com/brege/md-to-pdf-plugins.git', { name: 'plugins1-list-test' });
    await manager.addCollection(localSourcePath, { name: 'plugins2-list-test' });

    try {
        const collections = await manager.listCollections('downloaded');
        assert.ok(collections.includes('plugins1-list-test'), `(${testName}) List should include plugins1-list-test`);
        assert.ok(collections.includes('plugins2-list-test'), `(${testName}) List should include plugins2-list-test`);
        const expectedCount = fss.readdirSync(testCollRoot).filter(
            item => fss.lstatSync(path.join(testCollRoot, item)).isDirectory()
        ).length;
        assert.strictEqual(collections.length, expectedCount, `(${testName}) Should list correct number of downloaded collections`);
        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localSourcePath);
    }
}

async function testListAvailablePlugins(testRunStats) {
    testRunStats.attempted++;
    const testName = "List Available Plugins (core functionality)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });

    const coll1Path = path.join(testCollRoot, 'coll1');
    const pluginAId = 'pluginA';
    const pluginAPath = path.join(coll1Path, pluginAId);

    const pluginBId = 'pluginB';
    const pluginBPath = path.join(coll1Path, pluginBId);

    const invalidPluginPath = path.join(coll1Path, 'notAPlugin');
    const emptyPluginPath = path.join(coll1Path, 'emptyPlugin');

    const coll2Path = path.join(testCollRoot, 'coll2');
    const pluginCId = 'pluginC';
    const pluginCPath = path.join(coll2Path, pluginCId);

    const pluginDId = 'pluginD';
    const pluginDPath = path.join(coll2Path, pluginDId);

    await fs.mkdir(pluginAPath, { recursive: true });
    await fs.writeFile(path.join(pluginAPath, `${pluginAId}.config.yaml`), yaml.dump({ description: 'Plugin A description' }));

    await fs.mkdir(pluginBPath, { recursive: true });
    await fs.writeFile(path.join(pluginBPath, `${pluginBId}.yaml`), yaml.dump({ description: 'Plugin B description (alt .yaml)' }));

    await fs.mkdir(invalidPluginPath, { recursive: true });
    await fs.writeFile(path.join(invalidPluginPath, `text.txt`), "not a config");
    await fs.writeFile(path.join(invalidPluginPath, `notAPlugin.config.yam`), "wrong extension");
    await fs.writeFile(path.join(invalidPluginPath, `some.other.config.yaml`), "name mismatch");
    await fs.mkdir(emptyPluginPath, { recursive: true });

    await fs.mkdir(pluginCPath, { recursive: true });
    await fs.writeFile(path.join(pluginCPath, `${pluginCId}.config.yaml`), yaml.dump({ description: 'Plugin C description' }));

    await fs.mkdir(pluginDPath, {recursive: true});
    await fs.writeFile(path.join(pluginDPath, `${pluginDId}.config.yaml`), "description: Plugin D\n  bad_yaml: - item1\n - item2");

    try {
        const expectedPluginCount = 4;
        let available = await manager.listAvailablePlugins();
        assert.strictEqual(available.length, expectedPluginCount, `(${testName}) Should find ${expectedPluginCount} plugins, found ${available.length}`);

        const pluginAInfo = available.find(p => p.plugin_id === pluginAId && p.collection === 'coll1');
        assert.ok(pluginAInfo, `(${testName}) Plugin A should be listed`);
        assert.strictEqual(pluginAInfo.description, 'Plugin A description', `(${testName}) Plugin A description incorrect`);
        assert.strictEqual(pluginAInfo.config_path, path.resolve(pluginAPath, `${pluginAId}.config.yaml`), `(${testName}) Plugin A config_path correct`);

        const pluginBInfo = available.find(p => p.plugin_id === pluginBId && p.collection === 'coll1');
        assert.ok(pluginBInfo, `(${testName}) Plugin B should be listed (using .yaml)`);
        assert.strictEqual(pluginBInfo.description, 'Plugin B description (alt .yaml)', `(${testName}) Plugin B description incorrect`);
        assert.strictEqual(pluginBInfo.config_path, path.resolve(pluginBPath, `${pluginBId}.yaml`), `(${testName}) Plugin B config_path correct`);

        const pluginCInfo = available.find(p => p.plugin_id === pluginCId && p.collection === 'coll2');
        assert.ok(pluginCInfo, `(${testName}) Plugin C should be listed`);
        assert.strictEqual(pluginCInfo.description, 'Plugin C description', `(${testName}) Plugin C description incorrect`);
        assert.strictEqual(pluginCInfo.config_path, path.resolve(pluginCPath, `${pluginCId}.config.yaml`), `(${testName}) Plugin C config_path correct`);

        const pluginDInfo = available.find(p => p.plugin_id === pluginDId && p.collection === 'coll2');
        assert.ok(pluginDInfo, `(${testName}) Plugin D (malformed config) should be listed`);
        assert.ok(pluginDInfo.description.includes('Error loading config:'), `(${testName}) Plugin D description should include error message`);
        assert.strictEqual(pluginDInfo.config_path, path.resolve(pluginDPath, `${pluginDId}.config.yaml`), `(${testName}) Plugin D config_path correct despite error`);

        available = await manager.listAvailablePlugins('coll1');
        assert.strictEqual(available.length, 2, `(${testName}) Should find 2 plugins in 'coll1'`);
        assert.ok(available.some(p => p.plugin_id === pluginAId), `(${testName}) Plugin A in coll1 filter`);
        assert.ok(available.some(p => p.plugin_id === pluginBId), `(${testName}) Plugin B in coll1 filter`);

        available = await manager.listAvailablePlugins('nonExistentCollection');
        assert.strictEqual(available.length, 0, `(${testName}) Should find 0 plugins in non-existent collection`);

        const emptyCollRoot = await createTestCollRoot();
        const emptyManager = new CollectionsManager({ collRoot: emptyCollRoot, debug: false });
        available = await emptyManager.listAvailablePlugins();
        assert.strictEqual(available.length, 0, `(${testName}) Should find 0 plugins in an empty COLL_ROOT`);
        await cleanupTestCollRoot(emptyCollRoot);

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


// This test was combined from testEnableAndListEnabledPlugins
async function testListEnabledPlugins(testRunStats) {
    testRunStats.attempted++;
    const testName = "List Enabled Plugins (after enabling)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-collection-list-enabled';
    const mockPlugin1Id = 'pluginAlphaList';
    const mockPlugin2Id = 'pluginBetaList';

    const mockPlugin1Path = path.join(testCollRoot, mockCollectionName, mockPlugin1Id);
    const mockPlugin1ConfigFilename = `${mockPlugin1Id}.config.yaml`;
    const mockPlugin1ConfigPath = path.join(mockPlugin1Path, mockPlugin1ConfigFilename);
    await fs.mkdir(mockPlugin1Path, { recursive: true });
    await fs.writeFile(mockPlugin1ConfigPath, yaml.dump({ description: 'Mock Plugin Alpha for List' }));

    const mockPlugin2Path = path.join(testCollRoot, mockCollectionName, mockPlugin2Id);
    const mockPlugin2ConfigFilename = `${mockPlugin2Id}.yaml`;
    const mockPlugin2ConfigPath = path.join(mockPlugin2Path, mockPlugin2ConfigFilename);
    await fs.mkdir(mockPlugin2Path, { recursive: true });
    await fs.writeFile(mockPlugin2ConfigPath, yaml.dump({ description: 'Mock Plugin Beta for List (.yaml)' }));

    // Pre-populate enabled.yaml for listing
    const customInvokeName = 'beta-custom-list';
    await manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`); // Enables as mockPlugin1Id
    await manager.enablePlugin(`${mockCollectionName}/${mockPlugin2Id}`, { name: customInvokeName });


    try {
        const allEnabled = await manager.listCollections('enabled');
        assert.strictEqual(allEnabled.length, 2, `(${testName}) listCollections("enabled") should return two plugins data.`);
        assert.ok(allEnabled.some(p => p.invoke_name === mockPlugin1Id), `(${testName}) listCollections enabled data has ${mockPlugin1Id}`);
        assert.ok(allEnabled.some(p => p.invoke_name === customInvokeName), `(${testName}) listCollections enabled data has ${customInvokeName}`);

        const filteredEnabled = await manager.listCollections('enabled', mockCollectionName);
        assert.strictEqual(filteredEnabled.length, 2, `(${testName}) listCollections("enabled", "${mockCollectionName}") should return two plugins data.`);

        const nonExistentFiltered = await manager.listCollections('enabled', 'nonExistentCollection');
        assert.strictEqual(nonExistentFiltered.length, 0, `(${testName}) listCollections("enabled", "nonExistentCollection") should result in an empty array for no matches.`);

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


async function runListTests(testRunStats) {
    await testListCollections(testRunStats);
    await testListAvailablePlugins(testRunStats);
    await testListEnabledPlugins(testRunStats); // Extracted from enable test
}

module.exports = {
    runListTests,
};
