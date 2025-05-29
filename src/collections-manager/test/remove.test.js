// dev/src/collections-manager/test/remove.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./test-helpers.js');

async function testRemoveCollection(testRunStats) {
    testRunStats.attempted++;
    const testName = "Remove Collection";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const collNameToRemove = 'collection-to-remove';
    const collPathToRemove = path.join(testCollRoot, collNameToRemove);

    const pluginId1 = 'pluginOne';
    const pluginId2 = 'pluginTwo';
    const invokeName1 = 'pluginOneInvoke'; // Will be options.name for v0.7.5
    const invokeName2 = 'pluginTwoInvoke'; // Will be options.name for v0.7.5

    const plugin1Path = path.join(collPathToRemove, pluginId1);
    await fs.mkdir(plugin1Path, { recursive: true });
    await fs.writeFile(path.join(plugin1Path, `${pluginId1}.config.yaml`), yaml.dump({ description: 'Plugin One' }));

    const plugin2Path = path.join(collPathToRemove, pluginId2);
    await fs.mkdir(plugin2Path, { recursive: true });
    await fs.writeFile(path.join(plugin2Path, `${pluginId2}.config.yaml`), yaml.dump({ description: 'Plugin Two' }));

    await fs.writeFile(path.join(collPathToRemove, METADATA_FILENAME), yaml.dump({ name: collNameToRemove, source: 'test-source' }));

    try {
        await assert.rejects(
            manager.removeCollection('nonExistentCollection'),
            /Collection "nonExistentCollection" not found/,
            `(${testName}) Should reject removing a non-existent collection`
        );
        // For v0.7.5, this will use options.name
        await manager.enablePlugin(`${collNameToRemove}/${pluginId1}`, { name: invokeName1 });
        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.find(p=>p.invoke_name === invokeName1).collection_name, collNameToRemove, `(${testName}) Plugin1 correctly enabled from collection`);

        await assert.rejects(
            manager.removeCollection(collNameToRemove),
            new RegExp(`Collection "${collNameToRemove}" has enabled plugins: "${invokeName1}" \\(from ${pluginId1}\\). Please disable them first or use the --force option.`),
            `(${testName}) Should reject removing collection with enabled plugins without force`
        );
        assert.ok(fss.existsSync(collPathToRemove), `(${testName}) Collection directory should still exist after failed removal without force`);
        // For v0.7.5, this will use options.name
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

        await fs.mkdir(collPathToRemove, { recursive: true });
        await fs.writeFile(path.join(collPathToRemove, METADATA_FILENAME), yaml.dump({ name: collNameToRemove, source: 'test-source-2' }));

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

async function runRemoveTests(testRunStats) {
    await testRemoveCollection(testRunStats);
}

module.exports = {
    runRemoveTests,
};
