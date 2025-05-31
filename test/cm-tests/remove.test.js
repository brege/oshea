// dev/test/cm-tests/remove.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../../src/collections-manager/index.js');
const {
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./cm-test-helpers.js');

async function testRemoveCollection(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Remove Collection";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const collNameToRemove = 'collection-to-remove-cm';
    const collPathToRemove = path.join(testCollRoot, collNameToRemove);

    const pluginId1 = 'pluginOneRemove';
    const pluginId2 = 'pluginTwoRemove';
    const invokeName1 = 'pluginOneInvokeCm';
    const invokeName2 = 'pluginTwoInvokeCm';

    // Setup initial collection and plugins
    const plugin1Path = path.join(collPathToRemove, pluginId1);
    await fs.mkdir(plugin1Path, { recursive: true });
    await fs.writeFile(path.join(plugin1Path, `${pluginId1}.config.yaml`), yaml.dump({ description: 'Plugin One CM' }));

    const plugin2Path = path.join(collPathToRemove, pluginId2);
    await fs.mkdir(plugin2Path, { recursive: true });
    await fs.writeFile(path.join(plugin2Path, `${pluginId2}.config.yaml`), yaml.dump({ description: 'Plugin Two CM' }));

    await fs.writeFile(path.join(collPathToRemove, METADATA_FILENAME), yaml.dump({ name: collNameToRemove, source: 'test-source-cm' }));

    try {
        await assert.rejects(
            manager.removeCollection('nonExistentCollectionCm'),
            /Collection "nonExistentCollectionCm" not found/,
            `(${testName}) Should reject removing a non-existent collection`
        );

        await manager.enablePlugin(`${collNameToRemove}/${pluginId1}`, { name: invokeName1 });
        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.find(p => p.invoke_name === invokeName1).collection_name, collNameToRemove, `(${testName}) Plugin1 correctly enabled from collection`);

        await assert.rejects(
            manager.removeCollection(collNameToRemove),
            new RegExp(`Collection "${collNameToRemove}" has enabled plugins: "${invokeName1}" \\(from ${pluginId1}\\). Please disable them first or use the --force option.`),
            `(${testName}) Should reject removing collection with enabled plugins without force`
        );
        assert.ok(fss.existsSync(collPathToRemove), `(${testName}) Collection directory should still exist after failed removal without force`);

        await manager.enablePlugin(`${collNameToRemove}/${pluginId2}`, { name: invokeName2 });
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled now`);

        const removeResultForced = await manager.removeCollection(collNameToRemove, { force: true });
        assert.ok(removeResultForced.success, `(${testName}) Removing collection with force should succeed`);
        assert.ok(!fss.existsSync(collPathToRemove), `(${testName}) Collection directory should be deleted after forced removal`);

        if (fss.existsSync(enabledManifestPath)) {
            manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
            assert.ok(!manifest.enabled_plugins.some(p => p.invoke_name === invokeName1), `(${testName}) Plugin1 should be disabled from manifest after forced collection removal`);
            assert.ok(!manifest.enabled_plugins.some(p => p.invoke_name === invokeName2), `(${testName}) Plugin2 should be disabled from manifest after forced collection removal`);
        }

        // Recreate for no-force removal test
        await fs.mkdir(collPathToRemove, { recursive: true });
        await fs.writeFile(path.join(collPathToRemove, METADATA_FILENAME), yaml.dump({ name: collNameToRemove, source: 'test-source-2-cm' }));
        // Ensure manifest is empty or doesn't list plugins from this collection
        if(fss.existsSync(enabledManifestPath)) { // if manifest exists, make sure its empty for this test
            await manager._writeEnabledManifest({ enabled_plugins: [] });
        }


        const removeResultNoForce = await manager.removeCollection(collNameToRemove);
        assert.ok(removeResultNoForce.success, `(${testName}) Removing collection with no enabled plugins (no force) should succeed`);
        assert.ok(!fss.existsSync(collPathToRemove), `(${testName}) Collection directory should be deleted`);

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

async function runRemoveTests(testRunStats, baseTestRunDir) {
    await testRemoveCollection(testRunStats, baseTestRunDir);
}

module.exports = {
    runRemoveTests,
};
