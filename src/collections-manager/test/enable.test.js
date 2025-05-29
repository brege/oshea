// dev/src/collections-manager/test/enable.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os'); // For joining paths with os.tmpdir()
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    METADATA_FILENAME, // Make sure this is exported from test-helpers.js if not already
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    // We might need setupLocalGitRepo if we test with local .git sources for specific prefixing rules
    setupLocalGitRepo 
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
            manager.enablePlugin(`${mockCollectionName}/${mockPlugin1Id}`, { name: customInvokeName }),
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
    const testName = "Enable All Plugins in Collection (Default & Override Prefixing)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true }); // Enable debug for more insight
    let enabledManifestPath = path.join(testCollRoot, ENABLED_MANIFEST_FILENAME);

    // --- Setup Collections with different source types ---
    const githubUser = 'testuser';
    const githubRepoUrl = `https://github.com/${githubUser}/testrepo.git`;
    const githubCollName = 'gh-coll';

    const genericGitDomain = 'my-git-server.com';
    const genericGitRepoUrl = `git@${genericGitDomain}:anotheruser/anotherrepo.git`;
    const genericGitCollName = 'generic-git-coll';

    const localPathSource = path.join(os.tmpdir(), `cm_local_src_for_enable_all_${Date.now()}`);
    const localCollName = 'local-path-coll';

    // Helper to create a dummy plugin and its metadata
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
    await fs.mkdir(localPathSource, { recursive: true }); // Create the actual local source dir
    await createDummyCollection(localCollName, localPathSource); // Add as a local path collection


    try {
        // Test 1: Default prefixing (GitHub source)
        console.log(chalk.magenta("  Sub-test: Default prefixing (GitHub source)"));
        let result = await manager.enableAllPluginsInCollection(githubCollName, {isCliCall: true}); // isCliCall to mimic CLI context for warnings
        assert.ok(result.success, `(${testName}) Enable all (GitHub default prefix) should succeed`);
        let manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled from GitHub coll`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin1`), `(${testName}) GitHub coll plugin1 correctly prefixed`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${githubUser}-plugin2`), `(${testName}) GitHub coll plugin2 correctly prefixed`);
        await fs.unlink(enabledManifestPath); // Clean for next sub-test

        // Test 2: Default prefixing (Generic Git source - should fallback to collectionName)
        console.log(chalk.magenta("  Sub-test: Default prefixing (Generic Git source)"));
        result = await manager.enableAllPluginsInCollection(genericGitCollName, {isCliCall: true});
        assert.ok(result.success, `(${testName}) Enable all (Generic Git default prefix) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled from Generic Git coll`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${genericGitCollName}-plugin1`), `(${testName}) Generic Git coll plugin1 correctly prefixed with collection name`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${genericGitCollName}-plugin2`), `(${testName}) Generic Git coll plugin2 correctly prefixed with collection name`);
        await fs.unlink(enabledManifestPath);

        // Test 3: Default prefixing (Local path source - should have no prefix)
        console.log(chalk.magenta("  Sub-test: Default prefixing (Local path source)"));
        result = await manager.enableAllPluginsInCollection(localCollName, {isCliCall: true});
        assert.ok(result.success, `(${testName}) Enable all (Local path default prefix) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins should be enabled from Local path coll`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin1`), `(${testName}) Local path coll plugin1 has no prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin2`), `(${testName}) Local path coll plugin2 has no prefix`);
        await fs.unlink(enabledManifestPath);

        // Test 4: --no-prefix option
        console.log(chalk.magenta("  Sub-test: --no-prefix option (GitHub source)"));
        result = await manager.enableAllPluginsInCollection(githubCollName, { noPrefix: true });
        assert.ok(result.success, `(${testName}) Enable all (GitHub coll, --no-prefix) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins enabled with --no-prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `plugin1`), `(${testName}) GitHub coll plugin1 with --no-prefix has no prefix`);
        await fs.unlink(enabledManifestPath);

        // Test 5: --prefix <custom> option
        console.log(chalk.magenta("  Sub-test: --prefix <custom> option (Local path source)"));
        const customPrefix = 'my-custom_';
        result = await manager.enableAllPluginsInCollection(localCollName, { prefix: customPrefix });
        assert.ok(result.success, `(${testName}) Enable all (Local coll, --prefix ${customPrefix}) should succeed`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Two plugins enabled with custom prefix`);
        assert.ok(manifest.enabled_plugins.some(p => p.invoke_name === `${customPrefix}plugin1`), `(${testName}) Local coll plugin1 with custom prefix correct`);
        await fs.unlink(enabledManifestPath);
        
        // Test 6: Conflict handling (within the same enableAll run, with default prefixing)
        // This scenario is harder to test directly with enableAllPluginsInCollection as it enables one-by-one and reports errors.
        // The more important conflict test is when enabling a second time or from a different collection.
        // We'll rely on the single `enablePlugin` conflict tests for basic conflict logic.
        // Let's ensure the summary message is correct.
        console.log(chalk.magenta("  Sub-test: Conflict during enableAll (simulated by pre-enabling one)"));
        // Pre-enable one plugin from githubCollName that will use the default prefix
        await manager.enablePlugin(`${githubCollName}/plugin1`, { name: `${githubUser}-plugin1` });
        result = await manager.enableAllPluginsInCollection(githubCollName, {isCliCall: true}); // Should enable plugin2, fail on plugin1
        assert.strictEqual(result.success, false, `(${testName}) Enable all with one conflict should report overall failure`);
        assert.ok(result.messages.some(m => m.includes(`${githubUser}-plugin1: failed -`) && m.includes('already in use')), `(${testName}) Conflict for ${githubUser}-plugin1 reported`);
        assert.ok(result.messages.some(m => m.includes(`${githubUser}-plugin2: enabled`)), `(${testName}) ${githubUser}-plugin2 enabled despite other conflict`);
        manifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        // Should have the pre-enabled plugin1 and the newly enabled plugin2 from the batch
        assert.strictEqual(manifest.enabled_plugins.length, 2, `(${testName}) Manifest should have 2 plugins after conflict`);
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
        await cleanupTestCollRoot(localPathSource); // Clean up the temp local source dir
    }
}


async function runEnableTests(testRunStats) {
    await testEnablePlugin(testRunStats);
    await testEnableAllPluginsInCollection(testRunStats);
}

module.exports = {
    runEnableTests,
};;
