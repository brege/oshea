// dev/src/collections-manager/test/archetype.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    createTestCollRoot,
    cleanupTestCollRoot,
} = require('./test-helpers.js');
const {
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    DEFAULT_ARCHETYPE_BASE_DIR_NAME
} = require('../constants');
const { toPascalCase } = require('../cm-utils');


// Helper to create a dummy source plugin for testing archetype
async function createTestSourcePlugin(basePath, collectionName, pluginId, hasConventionalCss = true, hasConventionalHandler = true, hasExampleMd = true) {
    const pluginPath = path.join(basePath, collectionName, pluginId);
    await fs.mkdir(pluginPath, { recursive: true });

    const configData = {
        description: `Original description for ${pluginId}`,
        handler_script: hasConventionalHandler ? `${pluginId}.js` : 'index.js',
        css_files: hasConventionalCss ? [`${pluginId}.css`, 'another.css'] : ['main.css'], // Ensure 'main.css' is in an array
        params: { original_param: "value" }
    };
    await fs.writeFile(path.join(pluginPath, `${pluginId}.config.yaml`), yaml.dump(configData));

    if (hasConventionalCss) {
        await fs.writeFile(path.join(pluginPath, `${pluginId}.css`), `/* CSS for ${pluginId} */\n.${pluginId}-class {}`);
    } else {
        await fs.writeFile(path.join(pluginPath, `main.css`), `/* Main CSS for ${pluginId} */\n.main-class {}`);
    }
    // Ensure 'another.css' is created if hasConventionalCss is true, otherwise it might not exist if the css_files array changes based on the flag
    if (hasConventionalCss) {
        await fs.writeFile(path.join(pluginPath, 'another.css'), `/* Another CSS */`);
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
        await fs.writeFile(collMetaPath, yaml.dump({ name: collectionName, source: 'local-test-source' }));
    }
    return pluginPath;
}

async function testSuccessfulArchetypeDefaultTarget(testRunStats) {
    testRunStats.attempted++;
    const testName = "Archetype Plugin - Successful (Default Target)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(); 
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });

    const sourceCollectionName = 'source-coll';
    const sourcePluginId = 'my-plugin';
    const newArchetypeName = 'customized-plugin';
    const sourcePluginIdPascal = toPascalCase(sourcePluginId);
    const newArchetypeNamePascal = toPascalCase(newArchetypeName);

    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId);

    const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
    const expectedArchetypePath = path.join(expectedArchetypeBase, newArchetypeName);

    try {
        const result = await manager.archetypePlugin(`${sourceCollectionName}/${sourcePluginId}`, newArchetypeName);
        assert.ok(result.success, `(${testName}) Archetype operation should succeed`);
        assert.strictEqual(result.archetypePath, expectedArchetypePath, `(${testName}) Archetype path should be correct`);
        assert.ok(fss.existsSync(expectedArchetypePath), `(${testName}) Archetype directory should exist at ${expectedArchetypePath}`);

        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        assert.ok(fss.existsSync(newConfigPath), `(${testName}) New config file ${newArchetypeName}.config.yaml should exist`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.config.yaml`)), `(${testName}) Old config file ${sourcePluginId}.config.yaml should not exist`);
        
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));
        assert.strictEqual(newConfigData.description, `Archetype of ${sourcePluginId}: Original description for ${sourcePluginId}`, `(${testName}) Description should be updated and reference original source ID`);
        
        assert.ok(newConfigData.css_files.includes(`${newArchetypeName}.css`), `(${testName}) CSS files in config should be updated to ${newArchetypeName}.css`);
        assert.ok(!newConfigData.css_files.includes(`${sourcePluginId}.css`), `(${testName}) Old CSS name ${sourcePluginId}.css should not be in config`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.css`)), `(${testName}) Renamed CSS file ${newArchetypeName}.css should exist`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.css`)), `(${testName}) Old CSS file ${sourcePluginId}.css should not exist`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `another.css`)), `(${testName}) Other CSS file 'another.css' should still exist`);

        assert.strictEqual(newConfigData.handler_script, `${newArchetypeName}.js`, `(${testName}) Handler script in config should be updated`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}.js`)), `(${testName}) Renamed handler script ${newArchetypeName}.js should exist`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}.js`)), `(${testName}) Old handler script ${sourcePluginId}.js should not exist`);

        assert.ok(fss.existsSync(path.join(expectedArchetypePath, `${newArchetypeName}-example.md`)), `(${testName}) Renamed example MD file should exist`);
        assert.ok(!fss.existsSync(path.join(expectedArchetypePath, `${sourcePluginId}-example.md`)), `(${testName}) Old example MD file should not exist`);

        const readmeContent = await fs.readFile(path.join(expectedArchetypePath, 'README.md'), 'utf8');
        assert.ok(readmeContent.includes(`**Note:** This is an archetype of the "${sourceCollectionName}/${sourcePluginId}" plugin, created as "${newArchetypeName}"`), `(${testName}) README should contain archetype note referencing original source`);
        assert.ok(readmeContent.includes(`Original ${newArchetypeName} content. Class name: ${newArchetypeNamePascal}Handler`), `(${testName}) README content should have string replacements for new name`);
        assert.ok(!readmeContent.includes(`Original ${sourcePluginId} content.`), `(${testName}) README original sourcePluginId string should be replaced`);


        const handlerContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}.js`), 'utf8');
        assert.ok(handlerContent.includes(`// Handler for ${newArchetypeName}`), `(${testName}) Handler content should have plugin ID replaced`);
        assert.ok(handlerContent.includes(`class ${newArchetypeNamePascal}Handler`), `(${testName}) Handler content should have PascalCase class name replaced`);
        assert.ok(handlerContent.includes(`console.log("${newArchetypeName}");`), `(${testName}) Handler content should have string literal plugin ID replaced`);
        assert.ok(!handlerContent.includes(sourcePluginId), `(${testName}) Handler content should not contain old plugin ID ${sourcePluginId}`);
        
        const exampleMdContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}-example.md`), 'utf8');
        assert.ok(exampleMdContent.includes(`# Example for ${newArchetypeName}`), `(${testName}) Example MD should have plugin ID replaced`);
        assert.ok(exampleMdContent.includes(`Content with ${newArchetypeName} name.`), `(${testName}) Example MD content should have plugin ID replaced`);
        assert.ok(!exampleMdContent.includes(sourcePluginId), `(${testName}) Example MD should not contain old plugin ID ${sourcePluginId}`);
        
        const cssContent = await fs.readFile(path.join(expectedArchetypePath, `${newArchetypeName}.css`), 'utf8');
        assert.ok(cssContent.includes(`/* CSS for ${newArchetypeName} */`), `(${testName}) CSS content should have plugin ID replaced`);
        assert.ok(cssContent.includes(`.${newArchetypeName}-class {}`), `(${testName}) CSS content should have class name replaced`);
        assert.ok(!cssContent.includes(sourcePluginId), `(${testName}) CSS content should not contain old plugin ID ${sourcePluginId}`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot); 
        const expectedArchetypeBase = path.join(path.dirname(testCollRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
        await cleanupTestCollRoot(expectedArchetypeBase); 
    }
}

async function testSuccessfulArchetypeCustomTarget(testRunStats) {
    testRunStats.attempted++;
    const testName = "Archetype Plugin - Successful (Custom Target Directory)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });

    const sourceCollectionName = 'source-coll-custom';
    const sourcePluginId = 'original-plugin';
    const newArchetypeName = 'my-special-archetype';
    
    const customArchetypeTargetBase = path.join(os.tmpdir(), `cm_custom_archetype_target_${Date.now()}`);
    await fs.mkdir(customArchetypeTargetBase, { recursive: true });
    const expectedArchetypePath = path.join(customArchetypeTargetBase, newArchetypeName);

    // Test with non-conventional CSS name and index.js handler
    await createTestSourcePlugin(testCollRoot, sourceCollectionName, sourcePluginId, false, false, false); 

    try {
        const result = await manager.archetypePlugin(
            `${sourceCollectionName}/${sourcePluginId}`,
            newArchetypeName,
            { targetDir: customArchetypeTargetBase }
        );
        assert.ok(result.success, `(${testName}) Archetype operation with custom target should succeed`);
        assert.strictEqual(result.archetypePath, expectedArchetypePath, `(${testName}) Archetype path should be in custom target`);
        assert.ok(fss.existsSync(expectedArchetypePath), `(${testName}) Archetype directory should exist in custom target`);

        const newConfigPath = path.join(expectedArchetypePath, `${newArchetypeName}.config.yaml`);
        assert.ok(fss.existsSync(newConfigPath), `(${testName}) New config file should exist in custom target`);
        
        const newConfigData = yaml.load(await fs.readFile(newConfigPath, 'utf8'));
        assert.strictEqual(newConfigData.description, `Archetype of ${sourcePluginId}: Original description for ${sourcePluginId}`, `(${testName}) Description should be updated in custom target`);

        // Verify non-conventional CSS and handler were copied and NOT renamed by default logic, but their content processed
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, 'main.css')), `(${testName}) 'main.css' should exist (not renamed)`);
        assert.ok(fss.existsSync(path.join(expectedArchetypePath, 'index.js')), `(${testName}) 'index.js' should exist (not renamed)`);
        assert.strictEqual(newConfigData.css_files[0], 'main.css', `(${testName}) CSS file in config should remain 'main.css'`);
        assert.strictEqual(newConfigData.handler_script, 'index.js', `(${testName}) Handler script in config should remain 'index.js'`);

        const mainCssContent = await fs.readFile(path.join(expectedArchetypePath, 'main.css'), 'utf8');
        assert.ok(mainCssContent.includes(`/* Main CSS for ${newArchetypeName} */`), `(${testName}) Non-conventional CSS content should have plugin ID replaced`);
        assert.ok(mainCssContent.includes(`.main-class {}`), `(${testName}) Non-conventional CSS content should retain original class if not matching plugin ID`);
        assert.ok(!mainCssContent.includes(sourcePluginId) || mainCssContent.includes(`Archetype of ${sourcePluginId}`), `(${testName}) Non-conventional CSS should not contain old plugin ID unless in description`);
        
        const indexJsContent = await fs.readFile(path.join(expectedArchetypePath, 'index.js'), 'utf8');
        assert.ok(indexJsContent.includes(`// Index Handler for ${newArchetypeName}`), `(${testName}) index.js content should have plugin ID replaced`);
        assert.ok(indexJsContent.includes(`console.log("${newArchetypeName}");`), `(${testName}) index.js content should have string literal plugin ID replaced`);
        assert.ok(!indexJsContent.includes(sourcePluginId) || indexJsContent.includes(`Archetype of ${sourcePluginId}`), `(${testName}) index.js should not contain old plugin ID unless in description`);


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

async function testArchetypeSourceNotFound(testRunStats) {
    testRunStats.attempted++;
    const testName = "Archetype Plugin - Source Not Found";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });
    const newArchetypeName = 'my-new-archetype';

    try {
        await assert.rejects(
            manager.archetypePlugin('non-existent-coll/some-plugin', newArchetypeName),
            /Source plugin "some-plugin" in collection "non-existent-coll" not found or its base_path\/config_path is missing./,
            `(${testName}) Should reject if source collection does not exist`
        );

        const sourceCollectionName = 'actual-coll';
        await fs.mkdir(path.join(testCollRoot, sourceCollectionName), { recursive: true });
        await fs.writeFile(path.join(testCollRoot, sourceCollectionName, METADATA_FILENAME), yaml.dump({ name: sourceCollectionName, source: 'local' }));

        await assert.rejects(
            manager.archetypePlugin(`${sourceCollectionName}/non-existent-plugin`, newArchetypeName),
            /Source plugin "non-existent-plugin" in collection "actual-coll" not found or its base_path\/config_path is missing./,
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

async function testArchetypeTargetExists(testRunStats) {
    testRunStats.attempted++;
    const testName = "Archetype Plugin - Target Directory Exists";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });

    const sourceCollectionName = 'source-coll-target-test';
    const sourcePluginId = 'plugin-to-copy';
    const newArchetypeName = 'existing-archetype-name';

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

async function runArchetypeTests(testRunStats) {
    await testSuccessfulArchetypeDefaultTarget(testRunStats);
    await testSuccessfulArchetypeCustomTarget(testRunStats);
    await testArchetypeSourceNotFound(testRunStats);
    await testArchetypeTargetExists(testRunStats);
}

module.exports = {
    runArchetypeTests,
};

