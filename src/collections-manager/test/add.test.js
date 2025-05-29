// dev/src/collections-manager/test/add.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk'); // Keep chalk for console messages if tests log directly

const CollectionsManager = require('../index.js');
const {
    METADATA_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo
} = require('./test-helpers.js'); // Import helpers

async function testAddCollectionGit(testRunStats) {
    testRunStats.attempted++;
    const testName = "Add Collection from Git URL (with metadata)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });
    const testRepoUrl = 'https://github.com/brege/md-to-pdf-plugins.git';
    const collectionName = 'brege-plugins-git-test';

    try {
        const resultPath = await manager.addCollection(testRepoUrl, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), `(${testName}) Correct path should be returned`);
        assert.ok(fss.existsSync(resultPath), `(${testName}) Collection directory should exist`);
        assert.ok(fss.existsSync(path.join(resultPath, 'README.md')), `(${testName}) README.md should exist in cloned repo`);

        const metaPath = path.join(resultPath, METADATA_FILENAME);
        assert.ok(fss.existsSync(metaPath), `(${testName}) ${METADATA_FILENAME} should be created`);
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metaData = yaml.load(metaContent);
        assert.strictEqual(metaData.source, testRepoUrl, `(${testName}) Metadata source should match original URL`);
        assert.strictEqual(metaData.name, collectionName, `(${testName}) Metadata name should match collection name`);
        assert.ok(metaData.added_on, `(${testName}) Metadata should have an added_on timestamp`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        // Optionally re-throw or handle to ensure main runner knows a test failed
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testAddCollectionLocal(testRunStats) {
    testRunStats.attempted++;
    const testName = "Add Collection from Local Path (with metadata)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: false });

    const localSourceDirName = `cm_local_source_test_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
    const dummyPluginId = 'dummy-local-plugin';
    const dummyPluginDir = path.join(localSourcePath, dummyPluginId);
    await fs.mkdir(dummyPluginDir, { recursive: true });
    await fs.writeFile(path.join(dummyPluginDir, `${dummyPluginId}.config.yaml`), 'description: A local test plugin.');

    const collectionName = 'local-collection-test';

    try {
        const resultPath = await manager.addCollection(localSourcePath, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), `(${testName}) Correct path should be returned for local add`);
        assert.ok(fss.existsSync(resultPath), `(${testName}) Local collection directory should exist`);
        assert.ok(fss.existsSync(path.join(resultPath, dummyPluginId, `${dummyPluginId}.config.yaml`)), `(${testName}) Copied plugin config should exist`);

        const metaPath = path.join(resultPath, METADATA_FILENAME);
        assert.ok(fss.existsSync(metaPath), `(${testName}) ${METADATA_FILENAME} should be created for local add`);
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metaData = yaml.load(metaContent);
        assert.strictEqual(metaData.source, localSourcePath, `(${testName}) Metadata source should match original local path`);
        assert.strictEqual(metaData.name, collectionName, `(${testName}) Metadata name should match collection name`);
        assert.ok(metaData.added_on, `(${testName}) Metadata should have an added_on timestamp`);

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

// Function to run all tests in this file
async function runAddTests(testRunStats) {
    await testAddCollectionGit(testRunStats);
    await testAddCollectionLocal(testRunStats);
    // Add more tests specific to 'add' functionality here if needed
}

module.exports = {
    runAddTests,
    // Export individual tests if needed for more granular control by the main runner
    testAddCollectionGit,
    testAddCollectionLocal
};
