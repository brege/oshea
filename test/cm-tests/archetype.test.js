// dev/test/cm-tests/archetype.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
// const os = require('os'); // Not strictly needed
const yaml = require('js-yaml');
const chalk = require('chalk'); 

const CollectionsManager = require('../../src/collections-manager/index.js');
const {
    createTestCollRoot, 
    cleanupTestCollRoot,
} = require('./cm-test-helpers.js'); 
const {
    METADATA_FILENAME,
    DEFAULT_ARCHETYPE_BASE_DIR_NAME
} = require('../../src/collections-manager/constants'); 
const { toPascalCase } = require('../../src/collections-manager/cm-utils'); 


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
    const fullSourceIdentifier = `${sourceCollectionName}/${sourcePluginId}`;

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId);

    const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
    const expectedArchetypePath = path.join(expectedArchetypeBase, newArchetypeName);

    try {
        const result = await manager.archetypePlugin(fullSourceIdentifier, newArchetypeName);
        assert.ok(result.success, `(${testName}) Archetype operation should succeed. Msg: ${result.message}`);
        
        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));
        
        // Corrected Assertion for description
        const expectedDesc = `Archetype of "${fullSourceIdentifier}": Original description for ${sourcePluginId}`;
        assert.strictEqual(newConfigData.description, expectedDesc, `(${testName}) Description should be updated. Expected: '${expectedDesc}', Got: '${newConfigData.description}'`);
        
        assert.ok(newConfigData.css_files.includes(`${newArchetypeName}.css`), `(${testName}) CSS files in config updated`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.css`)), `(${testName}) Renamed CSS file exists`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `another.css`)), `(${testName}) Other CSS file 'another.css' should still exist`);
        assert.strictEqual(newConfigData.handler_script, `${newArchetypeName}.js`, `(${testName}) Handler script in config updated`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.js`)), `(${testName}) Renamed handler script exists`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}-example.md`)), `(${testName}) Renamed example MD exists`);
        const readmeContent = await fs.readFile(path.join(expectedArchetypePath, 'README.md'), 'utf8');
        assert.ok(readmeContent.includes(`**Note:** This is an archetype of the "${fullSourceIdentifier}" plugin, created as "${newArchetypeName}"`), `(${testName}) README note`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error; 
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
    const fullSourceIdentifier = `${sourceCollectionName}/${sourcePluginId}`;
    
    const customArchetypeTargetBase = path.join(baseTestRunDir, `cm_custom_archetype_target_${Date.now()}`);
    await fs.mkdir(customArchetypeTargetBase, { recursive: true });
    const expectedArchetypePath = path.join(customArchetypeTargetBase, newArchetypeName);

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId, false, false, false); 

    try {
        const result = await manager.archetypePlugin(
            fullSourceIdentifier,
            newArchetypeName,
            { targetDir: customArchetypeTargetBase }
        );
        assert.ok(result.success, `(${testName}) Archetype with custom target should succeed. Msg: ${result.message}`);
        
        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));

        // Corrected Assertion for description
        const expectedDesc = `Archetype of "${fullSourceIdentifier}": Original description for ${sourcePluginId}`;
        assert.strictEqual(newConfigData.description, expectedDesc, `(${testName}) Description updated in custom target. Expected: '${expectedDesc}', Got: '${newConfigData.description}'`);
        
        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error; 
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
        const nonExistentCmId = 'non-existent-coll-cm/some-plugin';
        // Corrected Expected Regex
        await assert.rejects(
            manager.archetypePlugin(nonExistentCmId, newArchetypeName),
            /Source plugin "some-plugin" in collection "non-existent-coll-cm" not found via CollectionsManager.*?/,
            `(${testName}) Should reject if CM source plugin does not exist`
        );

        const sourceCollectionName = 'actual-coll-arch-cm';
        await fs.mkdir(path.join(testCollRoot, sourceCollectionName), { recursive: true });
        await fs.writeFile(path.join(testCollRoot, sourceCollectionName, METADATA_FILENAME), yaml.dump({ name: sourceCollectionName, source: 'local-cm' }));
        
        const nonExistentPluginInExistingColl = `${sourceCollectionName}/non-existent-plugin-cm`;
        // Corrected Expected Regex
        await assert.rejects(
            manager.archetypePlugin(nonExistentPluginInExistingColl, newArchetypeName),
            new RegExp(`Source plugin "non-existent-plugin-cm" in collection "${sourceCollectionName}" not found via CollectionsManager`),
            `(${testName}) Should reject if plugin does not exist in an existing CM collection`
        );

        const nonExistentDirectPath = './path/that/does/not/exist/plugin';
        await assert.rejects(
            manager.archetypePlugin(nonExistentDirectPath, newArchetypeName),
            /Source plugin path ".*?" \(from identifier ".*?"\) not found or is not a directory./,
            `(${testName}) Should reject if direct path source does not exist`
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

async function testArchetypeTargetExists(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Archetype Plugin - Target Directory Exists";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const sourceCollectionName = 'source-coll-target-test-cm';
    const sourcePluginId = 'plugin-to-copy-arch';
    const newArchetypeName = 'existing-archetype-name-cm';
    const fullSourceIdentifier = `${sourceCollectionName}/${sourcePluginId}`;

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId);

    const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
    const conflictingArchetypePath = path.join(expectedArchetypeBase, newArchetypeName);
    await fs.mkdir(conflictingArchetypePath, { recursive: true });
    await fs.writeFile(path.join(conflictingArchetypePath, 'dummy.txt'), 'this should cause conflict');

    try {
        const escapedPath = conflictingArchetypePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Corrected Expected Regex to include the full error message
        await assert.rejects(
            manager.archetypePlugin(fullSourceIdentifier, newArchetypeName),
            new RegExp(`Target archetype directory "${escapedPath}" already exists\\. Use --force to overwrite or choose a different name\\.`),
            `(${testName}) Should reject if target archetype directory already exists`
        );

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error; 
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
