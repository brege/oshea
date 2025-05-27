// dev/src/collections-manager/test/run-cm-tests.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const CollectionsManager = require('../index.js');
const yaml = require('js-yaml');
const chalk = require('chalk'); // Added chalk for test output

const TEST_COLL_ROOT_BASE = path.join(os.tmpdir(), 'cm_test_coll_root');
const METADATA_FILENAME = '.collection-metadata.yaml';
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

function runCliCommand(argsArray, cwd = process.cwd()) {
    const result = spawnSync('node', [path.resolve(__dirname, '../collections-manager-cli.js'), ...argsArray], {
        cwd,
        encoding: 'utf-8',
        stdio: 'pipe'
    });

    if (result.error) {
        console.error(`CLI Command Error: ${result.error}`);
    }
    return {
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        error: result.error
    };
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

    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'test-plugin.config.yaml'), 'description: A local test plugin.');
    await fs.mkdir(path.join(localSourcePath, 'another-plugin'), { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'another-plugin', 'config.yaml'), 'description: Another one.');

    const collectionName = 'local-collection-test';

    try {
        const resultPath = await manager.addCollection(localSourcePath, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), 'Correct path should be returned for local add');
        assert.ok(fss.existsSync(resultPath), 'Local collection directory should exist');
        assert.ok(fss.existsSync(path.join(resultPath, 'test-plugin.config.yaml')), 'Copied file should exist');
        assert.ok(fss.existsSync(path.join(resultPath, 'another-plugin', 'config.yaml')), 'Copied subdirectory file should exist');

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
        await cleanupTestCollRoot(localSourcePath);
    }
}

async function testListCollections() {
    testsAttempted++;
    console.log("\nRunning test: List Downloaded Collections...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });
    const localSourceListName = `cm_local_source_list_test_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceListName);

    await manager.addCollection('https://github.com/brege/md-to-pdf-plugins.git', { name: 'plugins1' });
    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'dummy.txt'), 'hello');
    await manager.addCollection(localSourcePath, { name: 'plugins2' });

    try {
        const collections = await manager.listCollections('downloaded');
        assert.ok(collections.includes('plugins1'), 'List should include plugins1');
        assert.ok(collections.includes('plugins2'), 'List should include plugins2');
        assert.strictEqual(collections.length, 2, 'Should list correct number of downloaded collections');
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
    await fs.writeFile(path.join(pluginBPath, `some-other-name.config.yaml`), yaml.dump({ description: 'Plugin B description (alt config)' }));

    await fs.mkdir(invalidPluginPath, { recursive: true });
    await fs.writeFile(path.join(invalidPluginPath, `text.txt`), "not a config");
    await fs.mkdir(emptyPluginPath, { recursive: true });

    await fs.mkdir(pluginCPath, { recursive: true });
    await fs.writeFile(path.join(pluginCPath, `${pluginCId}.config.yaml`), yaml.dump({ description: 'Plugin C description' }));

    await fs.mkdir(pluginDPath, {recursive: true});
    // Intentionally malformed YAML for pluginD:
    await fs.writeFile(path.join(pluginDPath, `${pluginDId}.config.yaml`), "description: Plugin D\n  bad_yaml: - item1\n - item2");

    try {
        let available = await manager.listAvailablePlugins();
        // Expect 4: pluginA, pluginB, pluginC, and pluginD (which will have an error description)
        assert.strictEqual(available.length, 4, `Should find 4 plugins, found ${available.length}`);

        const pluginAInfo = available.find(p => p.plugin_id === pluginAId && p.collection === 'coll1');
        assert.ok(pluginAInfo, 'Plugin A should be listed');
        assert.strictEqual(pluginAInfo.description, 'Plugin A description');

        const pluginBInfo = available.find(p => p.plugin_id === pluginBId && p.collection === 'coll1');
        assert.ok(pluginBInfo, 'Plugin B should be listed (alt config name)');
        assert.strictEqual(pluginBInfo.description, 'Plugin B description (alt config)');

        const pluginCInfo = available.find(p => p.plugin_id === pluginCId && p.collection === 'coll2');
        assert.ok(pluginCInfo, 'Plugin C should be listed');
        assert.strictEqual(pluginCInfo.description, 'Plugin C description');
        
        const pluginDInfo = available.find(p => p.plugin_id === pluginDId && p.collection === 'coll2');
        assert.ok(pluginDInfo, 'Plugin D (malformed config) should be listed');
        // Check if the description string INCLUDES the error message, to be robust against ANSI codes
        assert.ok(pluginDInfo.description.includes('Error loading config:'), 'Plugin D description should include error message');

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

    console.log(`\n--- Test Summary ---`);
    console.log(`Tests attempted: ${testsAttempted}`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsAttempted - testsPassed}`);

    await cleanupTestCollRoot(TEST_COLL_ROOT_BASE);

    if (testsPassed === testsAttempted && testsAttempted > 0) {
        console.log(chalk.greenBright("\nAll Collections Manager tests passed! ✅"));
        process.exit(0);
    } else {
        console.error(chalk.red("\nSome Collections Manager tests failed. ❌"));
        process.exit(1);
    }
}

runAllTests();
