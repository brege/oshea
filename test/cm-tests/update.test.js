// dev/test/cm-tests/update.test.js
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
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo,
    addCommitToLocalGitRepo,
    getHeadCommit,
    addUncommittedFileToClonedRepo,
    addLocalCommitToClonedRepo,
    simulateForcePushToRemote // Assuming this helper is in cm-test-helpers.js
} = require('./cm-test-helpers.js');

async function testUpdateCollection(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Update Collection (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    
    // Create a unique base for mock remotes within the main CM test run base directory
    const mockRemotesBase = path.join(baseTestRunDir, `cm_mock_remotes_${Date.now()}`);
    await fs.mkdir(mockRemotesBase, { recursive: true });
    const localGitRepoPath = path.join(mockRemotesBase, `cm_local_git_repo_update.git`);
    
    const collectionName = 'git-collection-to-update-cm';
    const collectionClonedPath = path.join(testCollRoot, collectionName);

    try {
        console.log(chalk.magenta("  Sub-test: Update non-existent collection"));
        const nonExistentResult = await manager.updateCollection('nonExistentCollectionForUpdateCm');
        assert.strictEqual(nonExistentResult.success, false, `(${testName}) Updating non-existent collection should fail`);
        assert.ok(nonExistentResult.message.includes('not found'), `(${testName}) Correct message for non-existent collection`);

        console.log(chalk.magenta("  Sub-test: Update local-path collection"));
        const localSourceDirName = `cm_local_update_source_cm_${Date.now()}`;
        const localSourcePath = path.join(baseTestRunDir, localSourceDirName); // In base for cleanup
        await fs.mkdir(localSourcePath, { recursive: true });
        await fs.writeFile(path.join(localSourcePath, "file.txt"), "local content cm");
        await manager.addCollection(localSourcePath, { name: 'local-update-coll-cm' });

        const localUpdateResult = await manager.updateCollection('local-update-coll-cm');
        assert.ok(localUpdateResult.success, `(${testName}) Updating local collection should report success`);
        assert.ok(localUpdateResult.message.includes('not from a recognized Git source'), `(${testName}) Correct message for non-Git local source`);
        // localSourcePath will be cleaned by the main cm_runner

        console.log(chalk.magenta("  Sub-test: Clean update (remote has new commits)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial.txt', 'Version 1 CM');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        
        let initialLocalCommit = getHeadCommit(collectionClonedPath);
        await addCommitToLocalGitRepo(localGitRepoPath, 'update.txt', 'Version 2 CM', 'Second commit CM');
        
        const gitUpdateResult = await manager.updateCollection(collectionName);
        assert.ok(gitUpdateResult.success, `(${testName}) Clean update should succeed. Message: ${gitUpdateResult.message}`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'update.txt')), `(${testName}) Update file 'update.txt' should exist`);
        let updatedLocalCommit = getHeadCommit(collectionClonedPath);
        assert.notStrictEqual(initialLocalCommit, updatedLocalCommit, `(${testName}) Local commit should change after clean update`);
        const updatedMeta = await manager._readCollectionMetadata(collectionName); // Use internal helper
        assert.ok(updatedMeta.updated_on, `(${testName}) Metadata 'updated_on' should exist after clean update.`);
        await manager.removeCollection(collectionName, {force: true}); // Clean up for next test

        console.log(chalk.magenta("  Sub-test: Update with untracked local changes (should abort)"));
        // Re-setup bare repo and add collection
        await setupLocalGitRepo(localGitRepoPath, 'initial_untracked.txt', 'Untracked Test Base CM');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        await addUncommittedFileToClonedRepo(collectionClonedPath, 'untracked_file.txt', 'This is an untracked file CM.');
        
        const untrackedUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(untrackedUpdateResult.success, false, `(${testName}) Update with untracked files should fail. Msg: ${untrackedUpdateResult.message}`);
        assert.ok(untrackedUpdateResult.message.includes('has local changes. Aborting update.'), `(${testName}) Correct abort message for untracked`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'untracked_file.txt')), `(${testName}) Untracked file should still exist`);
        await manager.removeCollection(collectionName, {force: true});

        console.log(chalk.magenta("  Sub-test: Update with local commits (should abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial_local_commit.txt', 'Local Commit Test Base CM');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        await addLocalCommitToClonedRepo(collectionClonedPath, 'local_committed_file.txt', 'This is a local commit CM.', 'Local-only work CM');
        initialLocalCommit = getHeadCommit(collectionClonedPath); 
        await addCommitToLocalGitRepo(localGitRepoPath, 'remote_update_file.txt', 'Remote has new content CM', 'Remote update for local commit test CM');

        const localCommitUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(localCommitUpdateResult.success, false, `(${testName}) Update with local commits should abort. Msg: ${localCommitUpdateResult.message}`);
        assert.ok(localCommitUpdateResult.message.includes('has local commits not present on the remote.'), `(${testName}) Correct abort message for local commits`);
        assert.strictEqual(getHeadCommit(collectionClonedPath), initialLocalCommit, `(${testName}) Local commit HEAD should not change`);
        await manager.removeCollection(collectionName, {force: true});

        console.log(chalk.magenta("  Sub-test: Update after remote force push (should currently abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'original_history_file.txt', 'Commit A original CM');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        const commitBeforeForcePush = getHeadCommit(collectionClonedPath);
        // Simulate force push by re-initializing the bare repo with new history
        await simulateForcePushToRemote(localGitRepoPath, 'new_forced_history_file.txt', 'Commit X new history CM', { commitMessage: "Forced: New V2 History CM"});
        
        const forcePushUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(forcePushUpdateResult.success, false, `(${testName}) Update after force push should abort. Msg: ${forcePushUpdateResult.message}`);
        assert.ok(forcePushUpdateResult.message.includes('has local commits not present on the remote'), `(${testName}) Correct abort message for force push`);
        assert.strictEqual(getHeadCommit(collectionClonedPath), commitBeforeForcePush, `(${testName}) Local commit HEAD should NOT change`);
        await manager.removeCollection(collectionName, {force: true});
        
        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error; // Re-throw to fail the suite
    } finally {
        await cleanupTestCollRoot(testCollRoot); // Cleans MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE dir
        await cleanupTestCollRoot(mockRemotesBase); // Clean up the base for mock remotes
    }
}

async function testUpdateAllCollections(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Update All Collections (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const mockRemotesBase = path.join(baseTestRunDir, `cm_mock_remotes_all_${Date.now()}`);
    await fs.mkdir(mockRemotesBase, { recursive: true });

    const localGitRepoPath1 = path.join(mockRemotesBase, `cm_local_git_repo_all1.git`);
    const gitCollectionName1 = 'git-coll-all-1-cm';
    await setupLocalGitRepo(localGitRepoPath1, 'file1_repo1.txt', 'Initial content for repo1 CM');
    await manager.addCollection(localGitRepoPath1, { name: gitCollectionName1 });
    const collection1ClonedPath = path.join(testCollRoot, gitCollectionName1);

    const localSourceDirName = `cm_local_source_all_cm_${Date.now()}`;
    const localSourcePath = path.join(baseTestRunDir, localSourceDirName);
    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, "local_file_in_all.txt"), "content cm");
    await manager.addCollection(localSourcePath, { name: 'local-coll-all-cm' });

    const localGitRepoPath2 = path.join(mockRemotesBase, `cm_local_git_repo_all2.git`);
    const gitCollectionName2 = 'git-coll-all-2-local-changes-cm';
    await setupLocalGitRepo(localGitRepoPath2, 'main_repo2.txt', 'Base for local changes test in repo2 CM');
    await manager.addCollection(localGitRepoPath2, { name: gitCollectionName2 });
    const collection2ClonedPath = path.join(testCollRoot, gitCollectionName2);
    await addUncommittedFileToClonedRepo(collection2ClonedPath, 'untracked_in_coll2.txt', 'This should cause abort CM.');

    await addCommitToLocalGitRepo(localGitRepoPath1, 'update1_repo1.txt', 'Updated content for repo1 CM', 'Update for repo1 CM');

    try {
        const results = await manager.updateAllCollections();
        assert.ok(results.success === false, `(${testName}) updateAllCollections should report overall process failure due to one abort. Messages: ${JSON.stringify(results.messages)}`);

        assert.ok(fss.existsSync(path.join(collection1ClonedPath, 'update1_repo1.txt')), `(${testName}) ${gitCollectionName1} should have 'update1_repo1.txt'`);
        const updatedMeta1 = await manager._readCollectionMetadata(gitCollectionName1);
        assert.ok(updatedMeta1.updated_on, `(${testName}) Metadata for ${gitCollectionName1} should have updated_on`);

        assert.ok(fss.existsSync(path.join(collection2ClonedPath, 'untracked_in_coll2.txt')), `(${testName}) Untracked file in ${gitCollectionName2} should still exist`);
        const meta2 = await manager._readCollectionMetadata(gitCollectionName2);
        assert.strictEqual(meta2.updated_on, undefined, `(${testName}) ${gitCollectionName2} should NOT have updated_on`);
        
        const expectedGit1UpdateMessage = `Collection "${gitCollectionName1}" updated.`;
        assert.ok(results.messages.includes(expectedGit1UpdateMessage), `(${testName}) Success message for ${gitCollectionName1} expected. Got: ${JSON.stringify(results.messages)}`);
        
        const expectedGit2AbortMessageStart = `Collection "${gitCollectionName2}" has local changes. Aborting update.`;
        assert.ok(results.messages.some(msg => msg.startsWith(expectedGit2AbortMessageStart)), `(${testName}) Abort message for ${gitCollectionName2} starting with "${expectedGit2AbortMessageStart}" expected.`);

        const expectedLocalSkipMessage = `Skipping local-coll-all-cm: Not a Git-based collection (source: ${localSourcePath}).`;
        assert.ok(results.messages.some(msg => msg.replace(/\\/g, '/').includes(expectedLocalSkipMessage.replace(/\\/g, '/'))), `(${testName}) Skip message for 'local-coll-all-cm' expected. Actual: ${JSON.stringify(results.messages)}`);


        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(mockRemotesBase);
    }
}


async function runUpdateTests(testRunStats, baseTestRunDir) {
    await testUpdateCollection(testRunStats, baseTestRunDir);
    await testUpdateAllCollections(testRunStats, baseTestRunDir);
}

module.exports = {
    runUpdateTests,
};
