// dev/test/cm-tests/enable.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../../src/collections-manager/index.js');
const {
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo // Assuming this might be used for advanced prefixing tests later
} = require('./cm-test-helpers.js');

async function testEnablePlugin(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Enable Plugin and Verify Manifest";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const mockCollectionName = 'test-collection-enable-cm';
    const mockPlugin1Id = 'pluginAlphaEnable';
    const mockPlugin2Id = 'pluginBetaEnable';

    const mockPlugin1Path = path.join(testCollRoot, mockCollectionName, mockPlugin1Id);
    const mockPlugin1ConfigFilename = `${mockPlugin1Id}.config.yaml`;
    const mockPlugin1ConfigPath = path.join(mockPlugin1Path, mockPlugin1ConfigFilename);
    await fs.mkdir(mockPlugin1Path, { recursive: true });
    await fs.writeFile(mockPlugin1ConfigPath, yaml.dump({ description: 'Mock Plugin Alpha Enable CM' }));

    const mockPlugin2Path = path.join(testCollRoot, mockCollectionName, mockPlugin2Id);
    const mockPlugin2ConfigFilename = `${mockPlugin2Id}.yaml`; // Test with .yaml extension
    const mockPlugin2ConfigPath = path.join(mockPlugin2Path, mockPlugin2ConfigFilename);
    await fs.mkdir(mockPlugin2Path, { recursive: true });
    await fs.writeFile(mockPlugin2ConfigPath, yaml.dump({ description: 'Mock Plugin Beta Enable CM (.yaml)' }));

    try {
        const enableResult1 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`);
        assert.ok(enableResult1.success, `(${testName}) Enable ${mockPlugin1Id} should succeed`);
        assert.strictEqual(enableResult1.invoke_name, mockPlugin1Id, `(${testName}) Default invoke_name for ${mockPlugin1Id} is correct`);

        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 1, `(${testName}) One plugin should be enabled`);
        let enabledPlugin1 = manifest.enabled_plugins[0];
        assert.strictEqual(enabledPlugin1.collection_name, mockCollectionName, `(${testName}) ${mockPlugin1Id} collection_name correct`);
        assert.strictEqual(enabledPlugin1.plugin_id, mockPlugin1Id, `(${testName}) ${mockPlugin1Id} plugin_id correct`);
        assert.strictEqual(enabledPlugin1.invoke_name, mockPlugin1Id, `(${testName}) ${mockPlugin1Id} invoke_name correct`);
        assert.strictEqual(enabledPlugin1.config_path, path.resolve(mockPlugin1ConfigPath), `(${testName}) ${mockPlugin1Id} config_path correct`);
        assert.ok(enabledPlugin1.added_on, `(${testName}) ${mockPlugin1Id} has an added_on timestamp`);

        const customInvokeName = 'beta-custom-enable-cm';
        const enableResult2 = await manager.enablePlugin(`${mockCollectionName}/${mockPlugin2Id}`, { name: customInvokeName });
        assert.ok(enableResult2.success, `(${testName}) Enable ${mockPlugin2Id} with custom name should succeed`);
        assert.strictEqual(enableResult2.invoke_name, customInvokeName, `(${testName}) Custom invoke_name for ${mockPlugin2Id} is correct`);

        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled`);

        enabledPlugin1 = manifest.enabled_plugins.find(p => p.invoke_name === mockPlugin1Id);
        const enabledPlugin2 = manifest.enabled_plugins.find(p => p.invoke_name === customInvokeName);

        assert.ok(enabledPlugin1, `(${testName}) ${mockPlugin1Id} still present after enabling ${mockPlugin2Id}`);
        assert.ok(enabledPlugin2, `(${testName}) ${mockPlugin2Id} (custom) found in manifest`);
        assert.strictEqual(enabledPlugin2.collection_name, mockCollectionName, `(${testName}) ${mockPlugin2Id} collection_name correct`);
        assert.strictEqual(enabledPlugin2.plugin_id, mockPlugin2Id, `(${testName}) ${mockPlugin2Id} plugin_id correct`);
        assert.strictEqual(enabledPlugin2.config_path, path.resolve(mockPlugin2ConfigPath), `(${testName}) ${mockPlugin2Id} config_path correct`);
        assert.ok(enabledPlugin2.added_on, `(${testName}) ${mockPlugin2Id} has an added_on timestamp`);

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`),
            new RegExp(`Invoke name "${mockPlugin1Id}" is already in use`),
            `(${testName}) Should reject enabling with conflicting default invoke_name`
        );

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`, { name: customInvokeName }),
            new RegExp(`Invoke name "${customInvokeName}" is already in use`),
            `(${testName}) Should reject enabling with conflicting custom invoke_name`
        );

        await assert.rejects(
            manager.enablePlugin(`${mockCollectionName}/nonExistentPluginEnableCm`),
            new RegExp(`Plugin "nonExistentPluginEnableCm" in collection "${mockCollectionName}" is not available`),
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


async function testEnableAllPluginsInCollection(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Enable All Plugins in Collection (Default & Override Prefixing)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    const enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    const githubUser = 'testusercm';
    const githubRepoUrl = `https://github.com/${githubUser}/testrepo-cm.git`; // Mock URL
    const githubCollName = 'gh-coll-enable-all-cm';

    const genericGitDomain = 'my-git-server-cm.com';
    const genericGitRepoUrl = `git@${genericGitDomain}:anotheruser/anotherrepo-cm.git`; // Mock URL
    const genericGitCollName = 'generic-git-coll-enable-all-cm';

    const localPathSourceDir = path.join(baseTestRunDir, `cm_local_src_enable_all_${Date.now()}`);
    await fs.mkdir(localPathSourceDir, { recursive: true }); // Ensure local source dir is created within baseTestRunDir
    const localCollName = 'local-path-coll-enable-all-cm';

    const createDummyCollection = async (collName, sourceUrlOrPath, pluginIds = ['plugin1', 'plugin2']) => {
        const collPath = path.join(testCollRoot, collName);
        await fs.mkdir(collPath, { recursive: true });
        await fs.writeFile(path.join(collPath, METADATA_FILENAME), yaml.dump({ name: collName, source: sourceUrlOrPath, added_on: new Date().toISOString() }));
        for (const pId of pluginIds) {
            const pPath = path.join(collPath, pId);
            await fs.mkdir(pPath, { recursive: true });
            await fs.writeFile(path.join(pPath, `${pId}.config.yaml`), yaml.dump({ description: `Plugin ${pId} from ${collName}` }));
        }
    };

    await createDummyCollection(githubCollName, githubRepoUrl);
    await createDummyCollection(genericGitCollName, genericGitRepoUrl);
    await createDummyCollection(localCollName, localPathSourceDir);


    try {
        console.log(chalk.magenta("  Sub-test: Default prefixing (GitHub source)"));
        let result = await manager.enableAllPluginsInCollection(githubCollName, { isCliCall: true });
        assert.ok(result.success, `(${testName}) Enable all (GitHub default prefix) should succeed. Messages: ${JSON.stringify(result.messages)}`);
        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins from GitHub coll. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin1`), `(${testName}) GitHub coll plugin1 prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin2`), `(${testName}) GitHub coll plugin2 prefix`);
        await fs.unlink(enabledManifestPath);

        console.log(chalk.magenta("  Sub-test: Default prefixing (Generic Git source)"));
        result = await manager.enableAllPluginsInCollection(genericGitCollName, { isCliCall: true });
        assert.ok(result.success, `(${testName}) Enable all (Generic Git default prefix) should succeed. Messages: ${JSON.stringify(result.messages)}`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins from Generic Git coll. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${genericGitCollName}-plugin1`), `(${testName}) Generic Git coll plugin1 collection name prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${genericGitCollName}-plugin2`), `(${testName}) Generic Git coll plugin2 collection name prefix`);
        await fs.unlink(enabledManifestPath);

        console.log(chalk.magenta("  Sub-test: Default prefixing (Local path source)"));
        result = await manager.enableAllPluginsInCollection(localCollName, { isCliCall: true });
        assert.ok(result.success, `(${testName}) Enable all (Local path default prefix) should succeed. Messages: ${JSON.stringify(result.messages)}`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins from Local path coll. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin1`), `(${testName}) Local path coll plugin1 no prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin2`), `(${testName}) Local path coll plugin2 no prefix`);
        await fs.unlink(enabledManifestPath);

        console.log(chalk.magenta("  Sub-test: --no-prefix option (GitHub source)"));
        result = await manager.enableAllPluginsInCollection(githubCollName, { noPrefix: true });
        assert.ok(result.success, `(${testName}) Enable all (GitHub coll, --no-prefix) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two with --no-prefix. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin1`), `(${testName}) GitHub coll plugin1 --no-prefix no prefix`);
        await fs.unlink(enabledManifestPath);

        console.log(chalk.magenta("  Sub-test: --prefix <custom> option (Local path source)"));
        const customPrefix = 'my-custom-cm_';
        result = await manager.enableAllPluginsInCollection(localCollName, { prefix: customPrefix });
        assert.ok(result.success, `(${testName}) Enable all (Local coll, --prefix ${customPrefix}) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two with custom prefix. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${customPrefix}plugin1`), `(${testName}) Local coll plugin1 custom prefix`);
        await fs.unlink(enabledManifestPath);
        
        console.log(chalk.magenta("  Sub-test: Conflict during enableAll (simulated by pre-enabling one)"));
        await manager.enablePlugin(`${githubCollName}/plugin1`, { name: `${githubUser}-plugin1` }); // Pre-enable
        result = await manager.enableAllPluginsInCollection(githubCollName, { isCliCall: true }); // Default prefixing
        assert.strictEqual(result.success, false, `(${testName}) Enable all with one conflict should report overall failure`);
        assert.ok(result.messages.some(m => m.includes(`${githubUser}-plugin1: failed -`) && m.includes('already in use')), `(${testName}) Conflict for ${githubUser}-plugin1 reported`);
        assert.ok(result.messages.some(m => m.includes(`${githubUser}-plugin2: enabled`)), `(${testName}) ${githubUser}-plugin2 enabled despite other conflict`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Manifest should have 2 plugins after conflict. Manifest: ${JSON.stringify(manifest)}`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin1`), `(${testName}) Pre-enabled ${githubUser}-plugin1 still present`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin2`), `(${testName}) ${githubUser}-plugin2 enabled successfully`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        // localPathSourceDir is inside baseTestRunDir and will be cleaned by the cm-runner
    }
}

async function runEnableTests(testRunStats, baseTestRunDir) {
    await testEnablePlugin(testRunStats, baseTestRunDir);
    await testEnableAllPluginsInCollection(testRunStats, baseTestRunDir);
}

module.exports = {
    runEnableTests,
};
