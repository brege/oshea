// dev/test/cm-tests/disable.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../../src/collections-manager/index.js');
const {
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot
} = require('./cm-test-helpers.js');

async function testDisablePlugin(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Disable Plugin";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-collection-disable-cm';
    const mockPluginId = 'pluginToDisableCm';
    const mockInvokeName = 'disableMeCm';

    const mockPluginPath = path.join(testCollRoot, mockCollectionName, mockPluginId);
    const mockPluginConfigPath = path.join(mockPluginPath, `${mockPluginId}.config.yaml`);
    await fs.mkdir(mockPluginPath, { recursive: true });
    await fs.writeFile(mockPluginConfigPath, yaml.dump({ description: 'Mock Plugin for Disabling CM' }));

    try {
        let disableResult = await manager.disablePlugin(mockInvokeName);
        assert.strictEqual(disableResult.success, false, `(${testName}) Should fail if manifest does not exist`);
        assert.ok(disableResult.message.includes('No plugins enabled'), `(${testName}) Correct message for no manifest`);

        await manager.enablePlugin(`${mockCollectionName}/${mockPluginId}`, { name: mockInvokeName });
        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 1, `(${testName}) One plugin should be enabled`);
        assert.strictEqual(manifest.enabled_plugins[0].invoke_name, mockInvokeName, `(${testName}) Correct plugin enabled`);

        disableResult = await manager.disablePlugin(mockInvokeName);
        assert.ok(disableResult.success, `(${testName}) Disabling existing plugin should succeed`);
        assert.ok(fss.existsSync(enabledManifestPath), `(${testName}) Manifest should still exist`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 0, `(${testName}) Plugin should be removed from manifest`);

        await manager.enablePlugin(`${mockCollectionName}/${mockPluginId}`, { name: 'anotherPluginCm' });
        disableResult = await manager.disablePlugin('nonExistentInvokeNameCm');
        assert.strictEqual(disableResult.success, false, `(${testName}) Disabling non-existent plugin should fail`);
        assert.ok(disableResult.message.includes('not found'), `(${testName}) Correct message for non-existent plugin`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 1, `(${testName}) Manifest should be unchanged after trying to disable non-existent`);

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

async function runDisableTests(testRunStats, baseTestRunDir) {
    await testDisablePlugin(testRunStats, baseTestRunDir);
}

module.exports = {
    runDisableTests,
};
