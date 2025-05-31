// dev/test/cm-tests/archetype.test.js
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
    cleanupTestCollRoot,
    // No specific Git helpers needed directly by archetype tests, but createTestCollRoot is essential
} = require('./cm-test-helpers.js'); // Uses the adapted helpers
const {
    METADATA_FILENAME,
    // ENABLED_MANIFEST_FILENAME, // Not directly used in archetype tests
    DEFAULT_ARCHETYPE_BASE_DIR_NAME
} = require('../../src/collections-manager/constants');
const { toPascalCase } = require('../../src/collections-manager/cm-utils');


// Helper to create a dummy source plugin for testing archetype
async function createTestSourcePlugin(basePath, collectionName, pluginId, hasConventionalCss = true, hasConventionalHandler = true, hasExampleMd = true) {
    const pluginPath = path.join(basePath, collectionName, pluginId);
    await fs.mkdir(pluginPath, { recursive: true });

    const configData = {
        description: `Original description for ${pluginId}`,
        handler_script: hasConventionalHandler ? `${pluginId}.js` : 'index.js',
        css_files: hasConventionalCss ? [`${pluginId}.css`, 'another.css'] : ['main.css'],
        params: { original_param: "value" }
    };
    await fs.writeFile(path.join(pluginPath, `${pluginId}.config.yaml`), yaml.dump(configData));

    if (hasConventionalCss) {
        await fs.writeFile(path.join(pluginPath, `${pluginId}.css`), `/* CSS for ${pluginId} */\n.${pluginId}-class {}`);
        await fs.writeFile(path.join(pluginPath, 'another.css'), `/* Another CSS */`);
    } else {
        await fs.writeFile(path.join(pluginPath, `main.css`), `/* Main CSS for ${pluginId} */\n.main-class {}`);
    }

    if (hasConventionalHandler) {
        await fs.writeFile(path.join(pluginPath, `${pluginId}.js`), `// Handler for ${pluginId}\nclass ${toPascalCase(pluginId)}Handler {}\nconsole.log("${pluginId}");`);
    } else {
        await fs.writeFile(path.join(pluginPath, `index.js`), `// Index Handler for ${pluginId}\nclass IndexHandler {}\nconsole.log("${pluginId}");`);
    }

    if (hasExampleMd) {
        await fs.writeFile(path.join(pluginPath, `${pluginId}-example.md`), `# Example for ${pluginId}\nContent with ${pluginId} name.`);
    }
    await fs.writeFile(path.join(pluginPath, `README.md`), `# ${pluginId} Readme\nOriginal ${pluginId} content. Class name: ${toPascalCase(pluginId)}Handler`);
    
    const collMetaPath = path.join(basePath, collectionName, METADATA_FILENAME);
    if (!fss.existsSync(collMetaPath)) {
        await fs.writeFile(collMetaPath, yaml.dump({ name: collectionName, source: 'local-test-source-cm-archetype' }));
    }
    return pluginPath;
}

async function testSuccessfulArchetypeDefaultTarget(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Archetype Plugin - Successful (Default Target)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const sourceCollectionName = 'source-coll-arch-cm';
    const sourcePluginId = 'my-plugin-arch';
    const newArchetypeName = 'customized-plugin-arch-cm';
    const sourcePluginIdPascal = toPascalCase(sourcePluginId);
    const newArchetypeNamePascal = toPascalCase(newArchetypeName);

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId);

    // The default archetype base is relative to the *manager's actual collRoot's parent*
    // For testing, this means it's relative to where testCollRoot is created.
    // testCollRoot is like /tmp/cm_module_test_base_XYZ/cm_coll_root_run_ABC/
    // So, path.dirname(testCollRoot) is /tmp/cm_module_test_base_XYZ/
    const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
    const expectedArchetypePath = path.join(expectedArchetypeBase, newArchetypeName);

    try {
        const result = await manager.archetypePlugin(`${sourceCollectionName}/${sourcePluginId}`, newArchetypeName);
        assert.ok(result.success, `(${testName}) Archetype operation should succeed`);
        assert.strictEqual(path.resolve(result.archetypePath), path.resolve(expectedArchetypePath), `(${testName}) Archetype path should be correct. Expected ${expectedArchetypePath}, Got ${result.archetypePath}`);
        assert.ok(fss.existsSync(expectedArchetypePath), `(${testName}) Archetype directory should exist at ${expectedArchetypePath}`);

        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        assert.ok(fss.existsSync(newConfigPath), `(${testName}) New config file ${newArchetypeName}.config.yaml should exist`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.config.yaml`)), `(${testName}) Old config file ${sourcePluginId}.config.yaml should not exist`);
        
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));
        assert.strictEqual(newConfigData.description, `Archetype of ${sourcePluginId}: Original description for ${sourcePluginId}`, `(${testName}) Description should be updated`);
        
        assert.ok(newConfigData.css_files.includes(`${newArchetypeName}.css`), `(${testName}) CSS files in config updated`);
        assert.ok(!newConfigData.css_files.includes(`${sourcePluginId}.css`), `(${testName}) Old CSS name not in config`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.css`)), `(${testName}) Renamed CSS file exists`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.css`)), `(${testName}) Old CSS file not exist`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `another.css`)), `(${testName}) Other CSS file 'another.css' should still exist`);

        assert.strictEqual(newConfigData.handler_script, `${newArchetypeName}.js`, `(${testName}) Handler script in config updated`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.js`)), `(${testName}) Renamed handler script exists`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.js`)), `(${testName}) Old handler script not exist`);

        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}-example.md`)), `(${testName}) Renamed example MD exists`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}-example.md`)), `(${testName}) Old example MD not exist`);

        const readmeContent = await fs.readFile(path.join(expectedArchetypePath, 'README.md'), 'utf8');
        assert.ok(readmeContent.includes(`**Note:** This is an archetype of the "${sourceCollectionName}/${sourcePluginId}" plugin, created as "${newArchetypeName}"`), `(${testName}) README note`);
        assert.ok(readmeContent.includes(`Original ${newArchetypeName} content. Class name: ${newArchetypeNamePascal}Handler`), `(${testName}) README content replacements`);
        
        const handlerContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}.js`), 'utf8');
        assert.ok(handlerContent.includes(`// Handler for ${newArchetypeName}`), `(${testName}) Handler content ID replaced`);
        assert.ok(handlerContent.includes(`class ${newArchetypeNamePascal}Handler`), `(${testName}) Handler class name replaced`);
        assert.ok(handlerContent.includes(`console.log("${newArchetypeName}");`), `(${testName}) Handler string literal replaced`);
        
        const exampleMdContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}-example.md`), 'utf8');
        assert.ok(exampleMdContent.includes(`# Example for ${newArchetypeName}`), `(${testName}) Example MD ID replaced`);
        
        const cssContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}.css`), 'utf8');
        assert.ok(cssContent.includes(`/* CSS for ${newArchetypeName} */`), `(${testName}) CSS content ID replaced`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot); 
        await cleanupTestCollRoot(expectedArchetypeBase); 
    }
}

async function testSuccessfulArchetypeCustomTarget(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Archetype Plugin - Successful (Custom Target Directory)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const sourceCollectionName = 'source-coll-custom-arch-cm';
    const sourcePluginId = 'original-plugin-arch';
    const newArchetypeName = 'my-special-archetype-cm';
    
    const customArchetypeTargetBase = path.join(baseTestRunDir, `cm_custom_archetype_target_${Date.now()}`);
    await fs.mkdir(customArchetypeTargetBase, { recursive: true });
    const expectedArchetypePath = path.join(customArchetypeTargetBase, newArchetypeName);

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId, false, false, false); 

    try {
        const result = await manager.archetypePlugin(
            `${sourceCollectionName}/${sourcePluginId}`,
            newArchetypeName,
            { targetDir: customArchetypeTargetBase }
        );
        assert.ok(result.success, `(${testName}) Archetype with custom target should succeed`);
        assert.strictEqual(path.resolve(result.archetypePath), path.resolve(expectedArchetypePath), `(${testName}) Archetype path in custom target`);
        assert.ok(fss.existsSync(expectedArchetypePath), `(${testName}) Archetype directory exists in custom target`);

        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        assert.ok(fss.existsSync(newConfigPath), `(${testName}) New config file exists in custom target`);
        
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));
        assert.strictEqual(newConfigData.description, `Archetype of ${sourcePluginId}: Original description for ${sourcePluginId}`, `(${testName}) Description updated in custom target`);

        assert.ok(fss.existsSync(path.join(expectedArchetypePath, 'main.css')), `(${testName}) 'main.css' exists (not renamed)`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, 'index.js')), `(${testName}) 'index.js' exists (not renamed)`);
        assert.strictEqual(newConfigData.css_files[0], 'main.css', `(${testName}) CSS file in config remains 'main.css'`);
        assert.strictEqual(newConfigData.handler_script, 'index.js', `(${testName}) Handler script in config remains 'index.js'`);

        const mainCssContent = await fs.readFile(path.join(expectedArchetypePath, 'main.css'), 'utf8');
        assert.ok(mainCssContent.includes(`/* Main CSS for ${newArchetypeName} */`), `(${testName}) Non-conventional CSS content ID replaced`);
        
        const indexJsContent = await fs.readFile(path.join(expectedArchetypePath, 'index.js'), 'utf8');
        assert.ok(indexJsContent.includes(`// Index Handler for ${newArchetypeName}`), `(${testName}) index.js content ID replaced`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(customArchetypeTargetBase); 
    }
}

async function testArchetypeSourceNotFound(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Archetype Plugin - Source Not Found";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    const newArchetypeName = 'my-new-archetype-cm';

    try {
        await assert.rejects(
            manager.archetypePlugin('non-existent-coll-cm/some-plugin', newArchetypeName),
            /Source plugin "some-plugin" in collection "non-existent-coll-cm" not found or its base_path\/config_path is missing./,
            `(${testName}) Should reject if source collection does not exist`
        );

        const sourceCollectionName = 'actual-coll-arch-cm';
        await fs.mkdir(path.join(testCollRoot, sourceCollectionName), { recursive: true });
        await fs.writeFile(path.join(testCollRoot, sourceCollectionName, METADATA_FILENAME), yaml.dump({ name: sourceCollectionName, source: 'local-cm' }));

        await assert.rejects(
            manager.archetypePlugin(`${sourceCollectionName}/non-existent-plugin-cm`, newArchetypeName),
            /Source plugin "non-existent-plugin-cm" in collection "actual-coll-arch-cm" not found or its base_path\/config_path is missing./,
            `(${testName}) Should reject if source plugin does not exist in an existing collection`
        );

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testArchetypeTargetExists(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Archetype Plugin - Target Directory Exists";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const sourceCollectionName = 'source-coll-target-test-cm';
    const sourcePluginId = 'plugin-to-copy-arch';
    const newArchetypeName = 'existing-archetype-name-cm';

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId);

    const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
    const conflictingArchetypePath = path.join(expectedArchetypeBase, newArchetypeName);
    await fs.mkdir(conflictingArchetypePath, { recursive: true });
    await fs.writeFile(path.join(conflictingArchetypePath, 'dummy.txt'), 'this should cause conflict');

    try {
        await assert.rejects(
            manager.archetypePlugin(`${sourceCollectionName}/${sourcePluginId}`, newArchetypeName),
            new RegExp(`Target archetype directory "${conflictingArchetypePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" already exists`),
            `(${testName}) Should reject if target archetype directory already exists`
        );

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(expectedArchetypeBase); 
    }
}

async function runArchetypeTests(testRunStats, baseTestRunDir) {
    await testSuccessfulArchetypeDefaultTarget(testRunStats, baseTestRunDir);
    await testSuccessfulArchetypeCustomTarget(testRunStats, baseTestRunDir);
    await testArchetypeSourceNotFound(testRunStats, baseTestRunDir);
    await testArchetypeTargetExists(testRunStats, baseTestRunDir);
}

module.exports = {
    runArchetypeTests,
};
