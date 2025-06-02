// dev/test/cm-tests/list.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../../src/collections-manager/index.js');
const {
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./cm-test-helpers.js');

async function testListCollectionsType(testRunStats, baseTestRunDir) { 
    testRunStats.attempted++;
    const testName = "CM: List Collections (type: collections/downloaded)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const localSourceListName = `cm_local_source_list_test_cm_${Date.now()}`;
    const localSourcePath = path.join(baseTestRunDir, localSourceListName); 
    await fs.mkdir(localSourcePath, { recursive: true });
    const dummyPluginIdInList = "dummy-plugin-for-list-cm";
    const dummyPluginDir = path.join(localSourcePath, dummyPluginIdInList);
    await fs.mkdir(dummyPluginDir, { recursive: true });
    await fs.writeFile(path.join(dummyPluginDir, `${dummyPluginIdInList}.config.yaml`), 'description: dummy for list cm');

    const collection1Name = 'plugins1-list-test-cm';
    const collection2Name = 'plugins2-list-test-cm';

    await manager.addCollection('https://github.com/brege/md-to-pdf-plugins.git', { name: collection1Name });
    await manager.addCollection(localSourcePath, { name: collection2Name });

    try {
        const collectionsInfo = await manager.listCollections('downloaded'); 
        
        assert.ok(
            collectionsInfo.some(c => c.name === collection1Name),
            `(${testName}) List should include object with name '${collection1Name}'`
        );
        assert.ok(
            collectionsInfo.some(c => c.name === collection2Name),
            `(${testName}) List should include object with name '${collection2Name}'`
        );

        const coll1Info = collectionsInfo.find(c => c.name === collection1Name);
        assert.ok(coll1Info, `(${testName}) Collection info for '${collection1Name}' should be found`);
        assert.strictEqual(coll1Info.source, 'https://github.com/brege/md-to-pdf-plugins.git', `(${testName}) Source for ${collection1Name} correct`);
        assert.ok(coll1Info.added_on, `(${testName}) ${collection1Name} should have added_on date`);

        const entries = await fs.readdir(testCollRoot, { withFileTypes: true });
        const actualCollectionDirs = entries.filter(dirent => dirent.isDirectory()).map(d => d.name);
        
        assert.strictEqual(collectionsInfo.length, actualCollectionDirs.length, `(${testName}) Should list correct number of downloaded collections. Expected ${actualCollectionDirs.length}, Got ${collectionsInfo.length}. Dirs: ${actualCollectionDirs.join(', ')} Collections: ${collectionsInfo.map(c=>c.name).join(', ')}`);
        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testListAllPluginsType(testRunStats, baseTestRunDir) { 
    testRunStats.attempted++;
    const testName = "CM: List All Available Plugins (type: all/available)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const coll1Name = 'coll1-list-avail-cm';
    const coll1Path = path.join(testCollRoot, coll1Name);
    const pluginAId = 'pluginAlist';
    const pluginAPath = path.join(coll1Path, pluginAId);
    const pluginBId = 'pluginBlist';
    const pluginBPath = path.join(coll1Path, pluginBId);

    const coll2Name = 'coll2-list-avail-cm';
    const coll2Path = path.join(testCollRoot, coll2Name);
    const pluginCId = 'pluginClist';
    const pluginCPath = path.join(coll2Path, pluginCId);
    const pluginDId = 'pluginDlistMalformed'; 
    const pluginDPath = path.join(coll2Path, pluginDId);

    await fs.mkdir(pluginAPath, { recursive: true });
    await fs.writeFile(path.join(pluginAPath, `${pluginAId}.config.yaml`), yaml.dump({ description: 'Plugin A description CM' }));
    await fs.mkdir(pluginBPath, { recursive: true });
    await fs.writeFile(path.join(pluginBPath, `${pluginBId}.yaml`), yaml.dump({ description: 'Plugin B description CM (alt .yaml)' }));
    await fs.mkdir(pluginCPath, { recursive: true });
    await fs.writeFile(path.join(pluginCPath, `${pluginCId}.config.yaml`), yaml.dump({ description: 'Plugin C description CM' }));
    await fs.mkdir(pluginDPath, { recursive: true });
    await fs.writeFile(path.join(pluginDPath, `${pluginDId}.config.yaml`), "description: Plugin D CM\n  bad_yaml: - item1\n - item2"); 

    try {
        const expectedPluginCount = 4;
        let allPlugins = await manager.listAvailablePlugins();
        assert.strictEqual(allPlugins.length, expectedPluginCount, `(${testName}) Should find ${expectedPluginCount} plugins globally`);

        const pluginAInfo = allPlugins.find(p => p.plugin_id === pluginAId && p.collection === coll1Name);
        assert.ok(pluginAInfo, `(${testName}) Plugin A (${pluginAId}) in ${coll1Name} should be listed`);
        assert.strictEqual(pluginAInfo.description, 'Plugin A description CM', `(${testName}) Plugin A description correct`);

        allPlugins = await manager.listAvailablePlugins(coll1Name);
        assert.strictEqual(allPlugins.length, 2, `(${testName}) Should find 2 plugins in '${coll1Name}' when filtered`);
        assert.ok(allPlugins.some(p => p.plugin_id === pluginAId), `(${testName}) Plugin A in ${coll1Name} filter`);
        assert.ok(allPlugins.some(p => p.plugin_id === pluginBId), `(${testName}) Plugin B in ${coll1Name} filter`);

        const pluginDInfo = (await manager.listAvailablePlugins(coll2Name)).find(p => p.plugin_id === pluginDId);
        assert.ok(pluginDInfo, `(${testName}) Malformed Plugin D should still be listed`);
        assert.ok(pluginDInfo.description.includes('Error loading config'), `(${testName}) Malformed Plugin D description should indicate error`);

        allPlugins = await manager.listAvailablePlugins('nonExistentCollection-cm');
        assert.strictEqual(allPlugins.length, 0, `(${testName}) Should find 0 plugins in non-existent collection`);

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

async function testListEnabledPluginsType(testRunStats, baseTestRunDir) { 
    testRunStats.attempted++;
    const testName = "CM: List Enabled Plugins (type: enabled)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const mockCollectionName = 'test-collection-list-enabled-cm';
    const mockPlugin1Id = 'pluginAlphaListCm';
    const mockPlugin2Id = 'pluginBetaListCm';

    const mockPlugin1Path = path.join(testCollRoot, mockCollectionName, mockPlugin1Id);
    await fs.mkdir(mockPlugin1Path, { recursive: true });
    await fs.writeFile(path.join(mockPlugin1Path, `${mockPlugin1Id}.config.yaml`), yaml.dump({ description: 'Mock Plugin Alpha for List CM' }));

    const mockPlugin2Path = path.join(testCollRoot, mockCollectionName, mockPlugin2Id);
    await fs.mkdir(mockPlugin2Path, { recursive: true });
    await fs.writeFile(path.join(mockPlugin2Path, `${mockPlugin2Id}.yaml`), yaml.dump({ description: 'Mock Plugin Beta for List CM (.yaml)' }));

    const customInvokeName = 'beta-custom-list-cm';
    await manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`, { name: mockPlugin1Id }); 
    await manager.enablePlugin(`${mockCollectionName}/${mockPlugin2Id}`, { name: customInvokeName });

    try {
        let enabledPlugins = await manager.listCollections('enabled');
        assert.strictEqual(enabledPlugins.length, 2, `(${testName}) listCollections("enabled") should return two plugins data.`);
        assert.ok(enabledPlugins.some(p => p.invoke_name === mockPlugin1Id), `(${testName}) Enabled list has ${mockPlugin1Id}`);
        assert.ok(enabledPlugins.some(p => p.invoke_name === customInvokeName), `(${testName}) Enabled list has ${customInvokeName}`);

        enabledPlugins = await manager.listCollections('enabled', mockCollectionName);
        assert.strictEqual(enabledPlugins.length, 2, `(${testName}) listCollections("enabled", "${mockCollectionName}") should return two plugins data.`);

        enabledPlugins = await manager.listCollections('enabled', 'nonExistentCollection-cm');
        assert.strictEqual(enabledPlugins.length, 0, `(${testName}) listCollections("enabled", "nonExistentCollection-cm") should be empty.`);

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

async function testListDisabledPluginsType(testRunStats, baseTestRunDir) { 
    testRunStats.attempted++;
    const testName = "CM: List Disabled Plugins (type: disabled)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const collName = 'coll-for-disabled-cm';
    const pluginEnabledId = 'plugEnaCm';
    const pluginDisabledId = 'plugDisCm';

    await fs.mkdir(path.join(testCollRoot, collName, pluginEnabledId), { recursive: true });
    await fs.writeFile(path.join(testCollRoot, collName, pluginEnabledId, `${pluginEnabledId}.config.yaml`), yaml.dump({ description: 'Enabled Plugin CM' }));
    await fs.mkdir(path.join(testCollRoot, collName, pluginDisabledId), { recursive: true });
    await fs.writeFile(path.join(testCollRoot, collName, pluginDisabledId, `${pluginDisabledId}.config.yaml`), yaml.dump({ description: 'Disabled Plugin CM' }));

    await manager.enablePlugin(`${collName}/${pluginEnabledId}`, { name: 'enabledInvokeNameCm' });

    try {
        const availableInColl = await manager.listAvailablePlugins(collName);
        const enabledInColl = await manager.listCollections('enabled', collName);
        const enabledPluginFullIds = new Set(enabledInColl.map(p => `${p.collection_name}/${p.plugin_id}`));
        const disabledInColl = availableInColl.filter(p => !enabledPluginFullIds.has(`${p.collection}/${p.plugin_id}`));

        assert.strictEqual(disabledInColl.length, 1, `(${testName}) Should find 1 disabled plugin in ${collName}`);
        assert.strictEqual(disabledInColl[0].plugin_id, pluginDisabledId, `(${testName}) Correct disabled plugin found in ${collName}`);

        const availableAll = await manager.listAvailablePlugins();
        const enabledAll = await manager.listCollections('enabled');
        const enabledAllFullIds = new Set(enabledAll.map(p => `${p.collection_name}/${p.plugin_id}`));
        const disabledAll = availableAll.filter(p => !enabledAllFullIds.has(`${p.collection}/${p.plugin_id}`));
        
        const foundPlugDisInAll = disabledAll.find(p => p.collection === collName && p.plugin_id === pluginDisabledId);
        assert.ok(foundPlugDisInAll, `(${testName}) Plugin ${pluginDisabledId} should be in the global list of disabled plugins.`);

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

async function runListTests(testRunStats, baseTestRunDir) { 
    await testListCollectionsType(testRunStats, baseTestRunDir);
    await testListAllPluginsType(testRunStats, baseTestRunDir);
    await testListEnabledPluginsType(testRunStats, baseTestRunDir);
    await testListDisabledPluginsType(testRunStats, baseTestRunDir);
}

module.exports = {
    runListTests,
};
