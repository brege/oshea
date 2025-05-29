// dev/src/collections-manager/test/update.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');

const CollectionsManager = require('../index.js');
const {
    METADATA_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo,
    addCommitToLocalGitRepo
} = require('./test-helpers.js');

async function testUpdateCollection(testRunStats) {
    testRunStats.attempted++;
    const testName = "Update Collection";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });
    const localGitRepoPath = path.join(os.tmpdir(), `cm_local_git_repo_${Date.now()}.git`);
    const collectionName = 'git-collection-to-update';

    try {
        console.log(chalk.magenta("  Sub-test: Update non-existent collection"));
        const nonExistentResult = await manager.updateCollection('nonExistentCollectionForUpdate');
        assert.strictEqual(nonExistentResult.success, false, `(${testName}) Updating non-existent collection should fail`);
        assert.ok(nonExistentResult.message.includes('not found'), `(${testName}) Correct message for non-existent collection`);

        console.log(chalk.magenta("  Sub-test: Update local-path collection"));
        const localSourceDirName = `cm_local_update_source_${Date.now()}`;
        const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
        await fs.mkdir(localSourcePath, { recursive: true });
        await manager.addCollection(localSourcePath, { name: 'local-update-coll' });

        const localUpdateResult = await manager.updateCollection('local-update-coll');
        assert.ok(localUpdateResult.success, `(${testName}) Updating local collection should report success (not an error)`);
        assert.strictEqual(localUpdateResult.message, `Collection "local-update-coll" not from a recognized Git source.`, `(${testName}) Correct message for non-Git local source`);
        await cleanupTestCollRoot(localSourcePath); // Clean up temp source for this sub-test

        console.log(chalk.magenta("  Sub-test: Update Git-based collection"));
        await setupLocalGitRepo(localGitRepoPath, 'initial.txt', 'Version 1');
        await manager.addCollection(localGitRepoPath, { name: collectionName });

        const collectionPath = path.join(testCollRoot, collectionName);
        assert.ok(fss.existsSync(path.join(collectionPath, 'initial.txt')), `(${testName}) Initial file should exist after add`);
        assert.ok(!fss.existsSync(path.join(collectionPath, 'update.txt')), `(${testName}) Update file should not exist yet`);

        const initialMetaContent = await fs.readFile(path.join(collectionPath, METADATA_FILENAME), 'utf8');
        const initialMetaData = yaml.load(initialMetaContent);
        const initialAddedOn = initialMetaData.added_on;
        assert.ok(initialAddedOn, `(${testName}) initial added_on date exists`);
        assert.strictEqual(initialMetaData.updated_on, undefined, `(${testName}) initial updated_on date should not exist`);

        await addCommitToLocalGitRepo(localGitRepoPath, 'update.txt', 'Version 2', 'Second commit');

        const gitUpdateResult = await manager.updateCollection(collectionName);
        assert.ok(gitUpdateResult.success, `(${testName}) Updating Git collection should succeed`);
        assert.ok(fss.existsSync(path.join(collectionPath, 'update.txt')), `(${testName}) Update file should exist after update`);
        const updatedFileContent = await fs.readFile(path.join(collectionPath, 'update.txt'), 'utf8');
        assert.strictEqual(updatedFileContent, 'Version 2', `(${testName}) Updated file content should be correct`);

        const updatedMetaContent = await fs.readFile(path.join(collectionPath, METADATA_FILENAME), 'utf8');
        const updatedMetaData = yaml.load(updatedMetaContent);
        assert.ok(updatedMetaData.updated_on, `(${testName}) Metadata should have an updated_on timestamp after update`);
        assert.notStrictEqual(initialMetaData.added_on, updatedMetaData.updated_on, `(${testName}) updated_on should be different from added_on`);
        if (initialMetaData.updated_on) {
            assert.notStrictEqual(initialMetaData.updated_on, updatedMetaData.updated_on, `(${testName}) updated_on should change after update`);
        }

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localGitRepoPath);
    }
}

async function testUpdateAllCollections(testRunStats) {
    testRunStats.attempted++;
    const testName = "Update All Collections";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: true });

    const localGitRepoPath1 = path.join(os.tmpdir(), `cm_local_git_repo_all1_${Date.now()}.git`);
    const gitCollectionName1 = 'git-coll-all-1';
    await setupLocalGitRepo(localGitRepoPath1, 'file1.txt', 'Initial content for repo1');
    await manager.addCollection(localGitRepoPath1, { name: gitCollectionName1 });

    const localSourceDirName = `cm_local_source_all_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
    await fs.mkdir(localSourcePath, { recursive: true });
    await manager.addCollection(localSourcePath, { name: 'local-coll-all' });

    await addCommitToLocalGitRepo(localGitRepoPath1, 'update1.txt', 'Updated content for repo1', 'Update for repo1');

    try {
        const results = await manager.updateAllCollections();
        assert.ok(results.success, `(${testName}) updateAllCollections should report overall success even if some are skipped`);

        const gitCollPath = path.join(testCollRoot, gitCollectionName1);
        assert.ok(fss.existsSync(path.join(gitCollPath, 'update1.txt')), `(${testName}) Git collection ${gitCollectionName1} should have update1.txt`);
        const updatedMetaContent = await fs.readFile(path.join(gitCollPath, METADATA_FILENAME), 'utf8');
        const updatedMetaData = yaml.load(updatedMetaContent);
        assert.ok(updatedMetaData.updated_on, `(${testName}) Metadata for ${gitCollectionName1} should have updated_on`);

        const localCollPath = path.join(testCollRoot, 'local-coll-all');
        const localMetaContent = await fs.readFile(path.join(localCollPath, METADATA_FILENAME), 'utf8');
        const localMetaData = yaml.load(localMetaContent);
        assert.strictEqual(localMetaData.updated_on, undefined, `(${testName}) Local collection metadata should not have updated_on`);

        const expectedGitUpdateMessage = `Collection "${gitCollectionName1}" updated.`;
        assert.ok(results.messages.some(msg => msg === expectedGitUpdateMessage), `(${testName}) Success message for ${gitCollectionName1} expected. Got: ${results.messages}`);

        const expectedLocalSkipMessageStart = `Skipping local-coll-all: Not a Git-based collection`;
        assert.ok(results.messages.some(msg => msg.startsWith(expectedLocalSkipMessageStart)), `(${testName}) Skip message for local-coll-all expected. Got: ${results.messages}`);


        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localGitRepoPath1);
        await cleanupTestCollRoot(localSourcePath);
    }
}

async function runUpdateTests(testRunStats) {
    await testUpdateCollection(testRunStats);
    await testUpdateAllCollections(testRunStats);
}

module.exports = {
    runUpdateTests,
};
