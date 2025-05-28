// dev/src/collections-manager/test/run-cm-tests.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
// const { spawnSync } = require('child_process'); // Not needed for direct method tests
const CollectionsManager = require('../index.js');
const yaml = require('js-yaml');
const chalk = require('chalk');

const TEST_COLL_ROOT_BASE = path.join(os.tmpdir(), 'cm_test_coll_root');
const METADATA_FILENAME = '.collection-metadata.yaml';
const ENABLED_MANIFEST_FILENAME = 'enabled.yaml'; 

let testRunCounter = 0;
let testsPassed = 0;
let testsAttempted = 0;

async function createTestCollRoot() {
    testRunCounter++;
    const uniqueTestCollRoot = path.join(TEST_COLL_ROOT_BASE, `run_${testRunCounter}`);
    await fs.mkdir(uniqueTestCollRoot, { recursive: true });
    return uniqueTestCollRoot;
}

async function cleanupTestCollRoot(collRootPath) {
    if (fss.existsSync(collRootPath)) {
        try {
            await fs.rm(collRootPath, { recursive: true, force: true });
        } catch (e) {
            // console.warn(`Could not cleanup test coll root ${collRootPath}: ${e.message}`);
        }
    }
}

async function testAddCollectionGit() {
    testsAttempted++;
    console.log("\nRunning test: Add Collection from Git URL (with metadata)...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });
    const testRepoUrl = 'https://github.com/brege/md-to-pdf-plugins.git';
    const collectionName = 'brege-plugins-git-test';

    try {
        const resultPath = await manager.addCollection(testRepoUrl, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), 'Correct path should be returned');
        assert.ok(fss.existsSync(resultPath), 'Collection directory should exist');
        assert.ok(fss.existsSync(path.join(resultPath, 'README.md')), 'README.md should exist in cloned repo');

        const metaPath = path.join(resultPath, METADATA_FILENAME);
        assert.ok(fss.existsSync(metaPath), `${METADATA_FILENAME} should be created`);
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metaData = yaml.load(metaContent);
        assert.strictEqual(metaData.source, testRepoUrl, 'Metadata source should match original URL');
        assert.strictEqual(metaData.name, collectionName, 'Metadata name should match collection name');
        assert.ok(metaData.added_on, 'Metadata should have an added_on timestamp');

        console.log(chalk.green("  PASSED: Add Collection from Git URL (with metadata)"));
        testsPassed++;
    } catch (error) {
        console.error(chalk.red("  FAILED: Add Collection from Git URL (with metadata)"), error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testAddCollectionLocal() {
    testsAttempted++;
    console.log("\nRunning test: Add Collection from Local Path (with metadata)...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });

    const localSourceDirName = `cm_local_source_test_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
    // Create a dummy plugin structure inside the local source path adhering to the rule
    const dummyPluginId = 'dummy-local-plugin';
    const dummyPluginDir = path.join(localSourcePath, dummyPluginId);
    await fs.mkdir(dummyPluginDir, { recursive: true });
    await fs.writeFile(path.join(dummyPluginDir, `${dummyPluginId}.config.yaml`), 'description: A local test plugin.');


    const collectionName = 'local-collection-test';

    try {
        const resultPath = await manager.addCollection(localSourcePath, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), 'Correct path should be returned for local add');
        assert.ok(fss.existsSync(resultPath), 'Local collection directory should exist');
        // Check for the copied dummy plugin's config
        assert.ok(fss.existsSync(path.join(resultPath, dummyPluginId, `${dummyPluginId}.config.yaml`)), 'Copied plugin config should exist');

        const metaPath = path.join(resultPath, METADATA_FILENAME);
        assert.ok(fss.existsSync(metaPath), `${METADATA_FILENAME} should be created for local add`);
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metaData = yaml.load(metaContent);
        assert.strictEqual(metaData.source, localSourcePath, 'Metadata source should match original local path');
        assert.strictEqual(metaData.name, collectionName, 'Metadata name should match collection name');
        assert.ok(metaData.added_on, 'Metadata should have an added_on timestamp');

        console.log(chalk.green("  PASSED: Add Collection from Local Path (with metadata)"));
        testsPassed++;
    } catch (error) {
        console.error(chalk.red("  FAILED: Add Collection from Local Path (with metadata)"), error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localSourcePath); // Clean up the source dir too
    }
}

async function testListCollections() {
    testsAttempted++;
    console.log("\nRunning test: List Downloaded Collections...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });
    const localSourceListName = `cm_local_source_list_test_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceListName);
    await fs.mkdir(localSourcePath, { recursive: true }); // Create an empty dir for local add
    // Ensure dummy plugin exists for local add to be meaningful if listAvailable is called on it
    const dummyPluginIdInList = "dummy-plugin-for-list";
    await fs.mkdir(path.join(localSourcePath, dummyPluginIdInList), { recursive: true });
    await fs.writeFile(path.join(localSourcePath, dummyPluginIdInList, `${dummyPluginIdInList}.config.yaml`), 'description: dummy');


    await manager.addCollection('https://github.com/brege/md-to-pdf-plugins.git', { name: 'plugins1-list-test' });
    await manager.addCollection(localSourcePath, { name: 'plugins2-list-test' });

    try {
        const collections = await manager.listCollections('downloaded');
        assert.ok(collections.includes('plugins1-list-test'), 'List should include plugins1-list-test');
        assert.ok(collections.includes('plugins2-list-test'), 'List should include plugins2-list-test');
        const expectedCount = fss.readdirSync(testCollRoot).filter(
            item => fss.lstatSync(path.join(testCollRoot, item)).isDirectory()
        ).length;
        assert.strictEqual(collections.length, expectedCount, 'Should list correct number of downloaded collections');
        console.log(chalk.green("  PASSED: List Downloaded Collections"));
        testsPassed++;
    } catch (error) {
        console.error(chalk.red("  FAILED: List Downloaded Collections"), error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localSourcePath);
    }
}


async function testListAvailablePlugins() {
    testsAttempted++;
    console.log("\nRunning test: List Available Plugins (core functionality)...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });

    const coll1Path = path.join(testCollRoot, 'coll1');
    const pluginAId = 'pluginA'; // Directory name
    const pluginAPath = path.join(coll1Path, pluginAId);
    
    // This plugin (pluginB) will use the alternative <pluginId>.yaml naming
    const pluginBId = 'pluginB'; // Directory name
    const pluginBPath = path.join(coll1Path, pluginBId);

    const invalidPluginPath = path.join(coll1Path, 'notAPlugin'); // Will not be found
    const emptyPluginPath = path.join(coll1Path, 'emptyPlugin'); // Will not be found

    const coll2Path = path.join(testCollRoot, 'coll2');
    const pluginCId = 'pluginC'; // Directory name
    const pluginCPath = path.join(coll2Path, pluginCId);
    
    // This plugin (pluginD) will have a correctly named config but malformed content
    const pluginDId = 'pluginD'; // Directory name
    const pluginDPath = path.join(coll2Path, pluginDId);

    // Create pluginA with pluginA.config.yaml
    await fs.mkdir(pluginAPath, { recursive: true });
    await fs.writeFile(path.join(pluginAPath, `${pluginAId}.config.yaml`), yaml.dump({ description: 'Plugin A description' }));
    
    // Create pluginB with pluginB.yaml
    await fs.mkdir(pluginBPath, { recursive: true });
    await fs.writeFile(path.join(pluginBPath, `${pluginBId}.yaml`), yaml.dump({ description: 'Plugin B description (alt .yaml)' }));

    // Create directories that should not be identified as valid plugins by the strict rule
    await fs.mkdir(invalidPluginPath, { recursive: true });
    await fs.writeFile(path.join(invalidPluginPath, `text.txt`), "not a config");
    await fs.writeFile(path.join(invalidPluginPath, `notAPlugin.config.yam`), "wrong extension"); // Note .yam
    await fs.writeFile(path.join(invalidPluginPath, `some.other.config.yaml`), "name mismatch");
    await fs.mkdir(emptyPluginPath, { recursive: true });


    // Create pluginC with pluginC.config.yaml
    await fs.mkdir(pluginCPath, { recursive: true });
    await fs.writeFile(path.join(pluginCPath, `${pluginCId}.config.yaml`), yaml.dump({ description: 'Plugin C description' }));

    // Create pluginD with pluginD.config.yaml (malformed content)
    await fs.mkdir(pluginDPath, {recursive: true});
    await fs.writeFile(path.join(pluginDPath, `${pluginDId}.config.yaml`), "description: Plugin D\n  bad_yaml: - item1\n - item2");


    try {
        // Expected: pluginA, pluginB, pluginC, pluginD (D will have error description)
        const expectedPluginCount = 4;
        let available = await manager.listAvailablePlugins();
        assert.strictEqual(available.length, expectedPluginCount, `Should find ${expectedPluginCount} plugins, found ${available.length}`);

        const pluginAInfo = available.find(p => p.plugin_id === pluginAId && p.collection === 'coll1');
        assert.ok(pluginAInfo, 'Plugin A should be listed');
        assert.strictEqual(pluginAInfo.description, 'Plugin A description');
        assert.strictEqual(pluginAInfo.config_path, path.resolve(pluginAPath, `${pluginAId}.config.yaml`), 'Plugin A config_path correct');

        const pluginBInfo = available.find(p => p.plugin_id === pluginBId && p.collection === 'coll1');
        assert.ok(pluginBInfo, 'Plugin B should be listed (using .yaml)');
        assert.strictEqual(pluginBInfo.description, 'Plugin B description (alt .yaml)');
        assert.strictEqual(pluginBInfo.config_path, path.resolve(pluginBPath, `${pluginBId}.yaml`), 'Plugin B config_path correct');

        const pluginCInfo = available.find(p => p.plugin_id === pluginCId && p.collection === 'coll2');
        assert.ok(pluginCInfo, 'Plugin C should be listed');
        assert.strictEqual(pluginCInfo.description, 'Plugin C description');
        assert.strictEqual(pluginCInfo.config_path, path.resolve(pluginCPath, `${pluginCId}.config.yaml`), 'Plugin C config_path correct');
        
        const pluginDInfo = available.find(p => p.plugin_id === pluginDId && p.collection === 'coll2');
        assert.ok(pluginDInfo, 'Plugin D (malformed config) should be listed');
        assert.ok(pluginDInfo.description.includes('Error loading config:'), 'Plugin D description should include error message');
        assert.strictEqual(pluginDInfo.config_path, path.resolve(pluginDPath, `${pluginDId}.config.yaml`), 'Plugin D config_path correct despite error');

        available = await manager.listAvailablePlugins('coll1');
        assert.strictEqual(available.length, 2, "Should find 2 plugins in 'coll1'");
        assert.ok(available.some(p => p.plugin_id === pluginAId), "Plugin A in coll1 filter");
        assert.ok(available.some(p => p.plugin_id === pluginBId), "Plugin B in coll1 filter");

        available = await manager.listAvailablePlugins('nonExistentCollection');
        assert.strictEqual(available.length, 0, 'Should find 0 plugins in non-existent collection');

        const emptyCollRoot = await createTestCollRoot();
        const emptyManager = new CollectionsManager({ collRoot: emptyCollRoot, debug: false });
        available = await emptyManager.listAvailablePlugins();
        assert.strictEqual(available.length, 0, 'Should find 0 plugins in an empty COLL_ROOT');
        await cleanupTestCollRoot(emptyCollRoot);

        console.log(chalk.green("  PASSED: List Available Plugins (core functionality)"));
        testsPassed++;
    } catch (error) {
        console.error(chalk.red("  FAILED: List Available Plugins (core functionality)"), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testEnableAndListEnabledPlugins() {
    testsAttempted++;
    const testName = "Enable and List Enabled Plugins";
    console.log(`\nRunning test: ${testName}...`);
    const testCollRoot = await createTestCollRoot();
    // Set debug: true for more verbose output from CollectionsManager during this test
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true }); 
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-collection';
    const mockPlugin1Id = 'pluginAlpha'; // Directory name
    const mockPlugin2Id = 'pluginBeta';  // Directory name

    // Setup pluginAlpha with <pluginId>.config.yaml
    const mockPlugin1Path = path.join(testCollRoot, mockCollectionName, mockPlugin1Id);
    const mockPlugin1ConfigFilename = `${mockPlugin1Id}.config.yaml`;
    const mockPlugin1ConfigPath = path.join(mockPlugin1Path, mockPlugin1ConfigFilename);
    await fs.mkdir(mockPlugin1Path, { recursive: true });
    await fs.writeFile(mockPlugin1ConfigPath, yaml.dump({ description: 'Mock Plugin Alpha' }));

    // Setup pluginBeta with <pluginId>.yaml
    const mockPlugin2Path = path.join(testCollRoot, mockCollectionName, mockPlugin2Id);
    const mockPlugin2ConfigFilename = `${mockPlugin2Id}.yaml`; // Adheres to new rule
    const mockPlugin2ConfigPath = path.join(mockPlugin2Path, mockPlugin2ConfigFilename);
    await fs.mkdir(mockPlugin2Path, { recursive: true });
    await fs.writeFile(mockPlugin2ConfigPath, yaml.dump({ description: 'Mock Plugin Beta (.yaml)' }));

    try {
        // Test 1: Enable pluginAlpha
        const enableResult1 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`);
        assert.ok(enableResult1.success, 'Enable pluginAlpha should succeed');
        assert.strictEqual(enableResult1.invoke_name, mockPlugin1Id, 'Default invoke_name for pluginAlpha is correct');

        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 1, 'One plugin should be enabled');
        let enabledPlugin1 = manifest.enabled_plugins[0];
        assert.strictEqual(enabledPlugin1.collection_name, mockCollectionName);
        assert.strictEqual(enabledPlugin1.plugin_id, mockPlugin1Id);
        assert.strictEqual(enabledPlugin1.invoke_name, mockPlugin1Id);
        assert.strictEqual(enabledPlugin1.config_path, path.resolve(mockPlugin1ConfigPath));
        assert.ok(enabledPlugin1.added_on, 'pluginAlpha has an added_on timestamp');

        // Test 2: Enable pluginBeta with a custom invoke_name
        const customInvokeName = 'beta-custom';
        const enableResult2 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin2Id}`, { as: customInvokeName });
        assert.ok(enableResult2.success, 'Enable pluginBeta with custom name should succeed');
        assert.strictEqual(enableResult2.invoke_name, customInvokeName, 'Custom invoke_name for pluginBeta is correct');
        
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, 'Two plugins should be enabled');
        
        enabledPlugin1 = manifest.enabled_plugins.find(p => p.invoke_name === mockPlugin1Id);
        const enabledPlugin2 = manifest.enabled_plugins.find(p => p.invoke_name === customInvokeName);

        assert.ok(enabledPlugin1, 'pluginAlpha still present after enabling pluginBeta');
        assert.ok(enabledPlugin2, 'pluginBeta (custom) found in manifest');
        assert.strictEqual(enabledPlugin2.collection_name, mockCollectionName);
        assert.strictEqual(enabledPlugin2.plugin_id, mockPlugin2Id);
        assert.strictEqual(enabledPlugin2.config_path, path.resolve(mockPlugin2ConfigPath));
        assert.ok(enabledPlugin2.added_on, 'pluginBeta has an added_on timestamp');

        // Test 3: Attempt to enable pluginAlpha again (conflict on default invoke_name)
        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`),
            /Invoke name "pluginAlpha" is already in use/,
            'Should reject enabling with conflicting default invoke_name'
        );

        // Test 4: Attempt to enable plugin1 with conflicting custom invoke_name
         await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`, { as: customInvokeName }),
            new RegExp(`Invoke name "${customInvokeName}" is already in use`), // Use RegExp for robust match
            'Should reject enabling with conflicting custom invoke_name'
        );

        // Test 5: Attempt to enable a non-existent plugin
        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/nonExistentPlugin`),
            /Plugin "nonExistentPlugin" in collection "test-collection" is not available/,
            'Should reject enabling a non-existent plugin'
        );
        
        // Test 6: List all enabled plugins
        console.log("  Listing all enabled plugins (test internal call):"); // For console during test run
        const allEnabled = await manager.listCollections('enabled'); // Method now logs internally
        assert.strictEqual(allEnabled.length, 2, 'listCollections("enabled") should return two plugins data.');
        assert.ok(allEnabled.some(p => p.invoke_name === mockPlugin1Id), `listCollections enabled data has ${mockPlugin1Id}`);
        assert.ok(allEnabled.some(p => p.invoke_name === customInvokeName), `listCollections enabled data has ${customInvokeName}`);

        // Test 7: List enabled plugins filtered by collection
        console.log(`  Listing enabled plugins for collection '${mockCollectionName}' (test internal call):`);
        const filteredEnabled = await manager.listCollections('enabled', mockCollectionName);
        assert.strictEqual(filteredEnabled.length, 2, `listCollections("enabled", "${mockCollectionName}") should return two plugins data.`);
        
        console.log(`  Listing enabled plugins for collection 'nonExistentCollection' (test internal call):`);
        const nonExistentFiltered = await manager.listCollections('enabled', 'nonExistentCollection'); // Returns undefined if empty, check based on console output
        assert.strictEqual(nonExistentFiltered, undefined, `listCollections("enabled", "nonExistentCollection") should result in console message and return undefined or empty array if modified.`);


        console.log(chalk.green(`  PASSED: ${testName}`));
        testsPassed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}


async function runAllTests() {
    console.log("Starting Collections Manager Tests...");
    if (fss.existsSync(TEST_COLL_ROOT_BASE)) {
        await fs.rm(TEST_COLL_ROOT_BASE, { recursive: true, force: true });
    }
    await fs.mkdir(TEST_COLL_ROOT_BASE, { recursive: true });

    testRunCounter = 0;
    testsPassed = 0;
    testsAttempted = 0;

    await testAddCollectionGit();
    await testAddCollectionLocal();
    await testListCollections();
    await testListAvailablePlugins();
    await testEnableAndListEnabledPlugins();

    console.log(`\n--- Test Summary ---`);
    console.log(`Tests attempted: ${testsAttempted}`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsAttempted - testsPassed}`);

    if (fss.existsSync(TEST_COLL_ROOT_BASE)) { 
        await cleanupTestCollRoot(TEST_COLL_ROOT_BASE);
    }

    if (testsPassed === testsAttempted && testsAttempted > 0) {
        console.log(chalk.greenBright("\nAll Collections Manager tests passed! ✅"));
        process.exit(0);
    } else {
        console.error(chalk.red("\nSome Collections Manager tests failed. ❌"));
        process.exit(1);
    }
}

runAllTests();
