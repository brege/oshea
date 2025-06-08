// dev/test/cm-tests/update.test.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const chalk = require('chalk');
const fsExtra = require('fs-extra'); 

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
    simulateForcePushToRemote
} = require('./cm-test-helpers.js');

async function testUpdateCollection(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Update Collection (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir);
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });
    
    const mockRemotesBase = path.join(baseTestRunDir, `cm_mock_remotes_single_update_${Date.now()}`);
    await fs.mkdir(mockRemotesBase, { recursive: true });
    const localGitRepoPath = path.join(mockRemotesBase, `cm_local_git_repo_update_single.git`);
    
    const gitCollectionName = 'git-collection-to-update-cm'; 
    const gitCollectionClonedPath = path.join(testCollRoot, gitCollectionName);

    const localSourcesBase = path.join(baseTestRunDir, `cm_local_sources_update_${Date.now()}`);
    await fs.mkdir(localSourcesBase, { recursive: true });


    try {
        console.log(chalk.magenta("  Sub-test: Update non-existent collection"));
        const nonExistentResult = await manager.updateCollection('nonExistentCollectionForUpdateCm');
        assert.strictEqual(nonExistentResult.success, false, `(${testName}) Updating non-existent collection should fail`);
        assert.ok(nonExistentResult.message.includes('not found'), `(${testName}) Correct message for non-existent collection`);

        console.log(chalk.magenta("  Sub-test: Update local-path collection (successful re-sync)"));
        const localSourceSyncDirName = `cm_local_sync_source_v1_cm`;
        const localSourceSyncPath = path.join(localSourcesBase, localSourceSyncDirName);
        await fs.mkdir(localSourceSyncPath, { recursive: true });
        await fs.writeFile(path.join(localSourceSyncPath, "fileA.txt"), "initial content A cm");
        await fs.writeFile(path.join(localSourceSyncPath, "fileToKeepThenDelete.txt"), "content to be deleted from source cm");
        
        const localSyncCollName = 'local-resync-coll-cm';
        await manager.addCollection(localSourceSyncPath, { name: localSyncCollName });
        const localSyncCollPath = path.join(testCollRoot, localSyncCollName);

        assert.ok(fss.existsSync(path.join(localSyncCollPath, "fileA.txt")), `(${testName}) Pre-update: fileA.txt should exist`);
        assert.ok(fss.existsSync(path.join(localSyncCollPath, "fileToKeepThenDelete.txt")), `(${testName}) Pre-update: fileToKeepThenDelete.txt should exist`);

        await fs.writeFile(path.join(localSourceSyncPath, "fileA.txt"), "updated content A cm"); 
        await fs.writeFile(path.join(localSourceSyncPath, "fileB.txt"), "new content B cm");   
        await fs.rm(path.join(localSourceSyncPath, "fileToKeepThenDelete.txt"));              

        const localUpdateSyncResult = await manager.updateCollection(localSyncCollName);
        assert.ok(localUpdateSyncResult.success, `(${testName}) Successful re-sync of local collection. Msg: ${localUpdateSyncResult.message}`);
        assert.ok(localUpdateSyncResult.message.includes('re-synced from local source'), `(${testName}) Correct message for local re-sync`);
        
        const updatedFileAContent = await fs.readFile(path.join(localSyncCollPath, "fileA.txt"), 'utf8');
        assert.strictEqual(updatedFileAContent, "updated content A cm", `(${testName}) fileA.txt should be updated in collection`);
        assert.ok(fss.existsSync(path.join(localSyncCollPath, "fileB.txt")), `(${testName}) fileB.txt should exist in collection after re-sync`);
        assert.ok(!fss.existsSync(path.join(localSyncCollPath, "fileToKeepThenDelete.txt")), `(${testName}) fileToKeepThenDelete.txt should be removed from collection after re-sync`);
        
        let localSyncMeta = await manager._readCollectionMetadata(localSyncCollName);
        assert.ok(localSyncMeta.updated_on, `(${testName}) Metadata 'updated_on' should exist for local re-synced collection.`);

        console.log(chalk.magenta("  Sub-test: Update local-path collection (source path missing)"));
        const localSourceMissingDirName = `cm_local_missing_source_cm`;
        const localSourceMissingPath = path.join(localSourcesBase, localSourceMissingDirName);
        await fs.mkdir(localSourceMissingPath, { recursive: true });
        await fs.writeFile(path.join(localSourceMissingPath, "fileC.txt"), "content C cm");

        const localMissingCollName = 'local-source-missing-coll-cm';
        await manager.addCollection(localSourceMissingPath, { name: localMissingCollName });
        await fsExtra.remove(localSourceMissingPath); 

        const localUpdateMissingResult = await manager.updateCollection(localMissingCollName);
        assert.strictEqual(localUpdateMissingResult.success, false, `(${testName}) Update should fail if original local source is missing`);
        assert.ok(localUpdateMissingResult.message.includes('Original local source path') && localUpdateMissingResult.message.includes('not found'), `(${testName}) Correct error message for missing local source. Got: ${localUpdateMissingResult.message}`);

        console.log(chalk.magenta("  Sub-test: Update local-path collection (source path not a directory)"));
        const localSourceNotDirName = `cm_local_not_dir_source_cm`;
        const localSourceNotDirPath = path.join(localSourcesBase, localSourceNotDirName);
        await fs.mkdir(localSourceNotDirPath, { recursive: true });
        await fs.writeFile(path.join(localSourceNotDirPath, "fileD.txt"), "content D cm");
        
        const localNotDirCollName = 'local-source-not-dir-coll-cm';
        await manager.addCollection(localSourceNotDirPath, { name: localNotDirCollName });
        await fsExtra.remove(localSourceNotDirPath); 
        await fs.writeFile(localSourceNotDirPath, "I am a file, not a directory"); 

        const localUpdateNotDirResult = await manager.updateCollection(localNotDirCollName);
        assert.strictEqual(localUpdateNotDirResult.success, false, `(${testName}) Update should fail if original local source is not a directory`);
        assert.ok(localUpdateNotDirResult.message.includes('is not a directory'), `(${testName}) Correct error message for local source not a directory. Got: ${localUpdateNotDirResult.message}`);

        console.log(chalk.magenta("  Sub-test: Clean Git update (remote has new commits)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial.txt', 'Version 1 CM');
        await manager.addCollection(localGitRepoPath, { name: gitCollectionName }); 
        
        let initialLocalCommit = getHeadCommit(gitCollectionClonedPath);
        await addCommitToLocalGitRepo(localGitRepoPath, 'update.txt', 'Version 2 CM', 'Second commit CM'); 
        
        const gitUpdateResult = await manager.updateCollection(gitCollectionName);
        assert.ok(gitUpdateResult.success, `(${testName}) Clean Git update should succeed. Message: ${gitUpdateResult.message}`);
        assert.ok(fss.existsSync(path.join(gitCollectionClonedPath, 'update.txt')), `(${testName}) Git Update file 'update.txt' should exist`);
        let updatedLocalCommit = getHeadCommit(gitCollectionClonedPath);
        assert.notStrictEqual(initialLocalCommit, updatedLocalCommit, `(${testName}) Git Local commit should change after clean update`);
        const updatedMeta = await manager._readCollectionMetadata(gitCollectionName);
        assert.ok(updatedMeta.updated_on, `(${testName}) Git Metadata 'updated_on' should exist after clean update.`);
        await manager.removeCollection(gitCollectionName, {force: true});

        console.log(chalk.magenta("  Sub-test: Git Update with untracked local changes (should abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial_untracked.txt', 'Untracked Test Base CM');
        await manager.addCollection(localGitRepoPath, { name: gitCollectionName });
        await addUncommittedFileToClonedRepo(gitCollectionClonedPath, 'untracked_file.txt', 'This is an untracked file CM.');
        
        const untrackedUpdateResult = await manager.updateCollection(gitCollectionName);
        assert.strictEqual(untrackedUpdateResult.success, false, `(${testName}) Git Update with untracked files should fail. Msg: ${untrackedUpdateResult.message}`);
        assert.ok(untrackedUpdateResult.message.includes('has local changes. Aborting update.'), `(${testName}) Correct abort message for untracked`);
        assert.ok(fss.existsSync(path.join(gitCollectionClonedPath, 'untracked_file.txt')), `(${testName}) Untracked file should still exist`);
        await manager.removeCollection(gitCollectionName, {force: true});

        console.log(chalk.magenta("  Sub-test: Git Update with local commits (should abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial_local_commit.txt', 'Local Commit Test Base CM');
        await manager.addCollection(localGitRepoPath, { name: gitCollectionName });
        await addLocalCommitToClonedRepo(gitCollectionClonedPath, 'local_committed_file.txt', 'This is a local commit CM.', 'Local-only work CM');
        initialLocalCommit = getHeadCommit(gitCollectionClonedPath); 
        await addCommitToLocalGitRepo(localGitRepoPath, 'remote_update_file.txt', 'Remote has new content CM', 'Remote update for local commit test CM');

        const localCommitUpdateResult = await manager.updateCollection(gitCollectionName);
        assert.strictEqual(localCommitUpdateResult.success, false, `(${testName}) Git Update with local commits should abort. Msg: ${localCommitUpdateResult.message}`);
        assert.ok(localCommitUpdateResult.message.includes('has local commits not present on the remote.'), `(${testName}) Correct abort message for local commits`);
        assert.strictEqual(getHeadCommit(gitCollectionClonedPath), initialLocalCommit, `(${testName}) Git Local commit HEAD should not change`);
        await manager.removeCollection(gitCollectionName, {force: true});

        console.log(chalk.magenta("  Sub-test: Git Update after remote force push (should currently abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'original_history_file.txt', 'Commit A original CM');
        await manager.addCollection(localGitRepoPath, { name: gitCollectionName });
        const commitBeforeForcePush = getHeadCommit(gitCollectionClonedPath);
        await simulateForcePushToRemote(localGitRepoPath, 'new_forced_history_file.txt', 'Commit X new history CM', { commitMessage: "Forced: New V2 History CM"});
        
        const forcePushUpdateResult = await manager.updateCollection(gitCollectionName);
        assert.strictEqual(forcePushUpdateResult.success, false, `(${testName}) Git Update after force push should abort. Msg: ${forcePushUpdateResult.message}`);
        assert.ok(forcePushUpdateResult.message.includes('has local commits not present on the remote'), `(${testName}) Correct abort message for force push`);
        assert.strictEqual(getHeadCommit(gitCollectionClonedPath), commitBeforeForcePush, `(${testName}) Git Local commit HEAD should NOT change`);
        await manager.removeCollection(gitCollectionName, {force: true});
        
        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error; 
    } finally {
        await cleanupTestCollRoot(testCollRoot); 
        await cleanupTestCollRoot(mockRemotesBase);
        await cleanupTestCollRoot(localSourcesBase);
    }
}

async function testUpdateAllCollections(testRunStats, baseTestRunDir) {
    testRunStats.attempted++;
    const testName = "CM: Update All Collections (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot(baseTestRunDir); // Pass baseTestRunDir
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM_TESTS === 'true' });

    const mockRemotesBase = path.join(baseTestRunDir, `cm_mock_remotes_all_${Date.now()}`);
    await fs.mkdir(mockRemotesBase, { recursive: true });
    const localSourcesBase = path.join(baseTestRunDir, `cm_local_sources_update_all_${Date.now()}`);
    await fs.mkdir(localSourcesBase, { recursive: true });

    const localGitRepoPath1 = path.join(mockRemotesBase, `cm_local_git_repo_all1.git`);
    const gitCollectionName1 = 'git-coll-all-1-cm';
    await setupLocalGitRepo(localGitRepoPath1, 'file1_repo1.txt', 'Initial content for repo1 CM');
    await manager.addCollection(localGitRepoPath1, { name: gitCollectionName1 });
    const collection1ClonedPath = path.join(testCollRoot, gitCollectionName1);

    const localSourcePathForUpdate = path.join(localSourcesBase, `cm_local_source_to_update_all_${Date.now()}`);
    await fs.mkdir(localSourcePathForUpdate, { recursive: true });
    await fs.writeFile(path.join(localSourcePathForUpdate, "original_local_file.txt"), "original local content cm");
    const localCollToUpdateName = 'local-coll-to-update-all-cm';
    await manager.addCollection(localSourcePathForUpdate, { name: localCollToUpdateName });
    const localCollToUpdateClonedPath = path.join(testCollRoot, localCollToUpdateName);

    const localGitRepoPath2 = path.join(mockRemotesBase, `cm_local_git_repo_all2.git`);
    const gitCollectionName2 = 'git-coll-all-2-local-changes-cm';
    await setupLocalGitRepo(localGitRepoPath2, 'main_repo2.txt', 'Base for local changes test in repo2 CM');
    await manager.addCollection(localGitRepoPath2, { name: gitCollectionName2 });
    const collection2ClonedPath = path.join(testCollRoot, gitCollectionName2);
    await addUncommittedFileToClonedRepo(collection2ClonedPath, 'untracked_in_coll2.txt', 'This should cause abort CM.');

    await addCommitToLocalGitRepo(localGitRepoPath1, 'update1_repo1.txt', 'Updated content for repo1 CM', 'Update for repo1 CM');
    await fs.writeFile(path.join(localSourcePathForUpdate, "original_local_file.txt"), "UPDATED local content cm");
    await fs.writeFile(path.join(localSourcePathForUpdate, "new_local_file.txt"), "new file for local re-sync cm");

    try {
        const results = await manager.updateAllCollections();
        assert.strictEqual(results.success, false, `(${testName}) updateAllCollections should report overall process failure due to one abort. Messages: ${JSON.stringify(results.messages)}`);

        assert.ok(fss.existsSync(path.join(collection1ClonedPath, 'update1_repo1.txt')), `(${testName}) ${gitCollectionName1} should have 'update1_repo1.txt'`);
        const updatedMeta1 = await manager._readCollectionMetadata(gitCollectionName1);
        assert.ok(updatedMeta1.updated_on, `(${testName}) Metadata for ${gitCollectionName1} should have updated_on`);

        assert.ok(fss.existsSync(path.join(localCollToUpdateClonedPath, 'new_local_file.txt')), `(${testName}) ${localCollToUpdateName} should have 'new_local_file.txt'`);
        const updatedLocalFileContent = await fs.readFile(path.join(localCollToUpdateClonedPath, 'original_local_file.txt'), 'utf8');
        assert.strictEqual(updatedLocalFileContent, "UPDATED local content cm", `(${testName}) ${localCollToUpdateName} original_local_file.txt should be updated`);
        const updatedMetaLocal = await manager._readCollectionMetadata(localCollToUpdateName);
        assert.ok(updatedMetaLocal.updated_on, `(${testName}) Metadata for ${localCollToUpdateName} should have updated_on`);
        
        assert.ok(fss.existsSync(path.join(collection2ClonedPath, 'untracked_in_coll2.txt')), `(${testName}) Untracked file in ${gitCollectionName2} should still exist`);
        const meta2 = await manager._readCollectionMetadata(gitCollectionName2);
        assert.strictEqual(meta2.updated_on, undefined, `(${testName}) ${gitCollectionName2} should NOT have updated_on`);
        
        const expectedGit1UpdateMessage = `Collection "${gitCollectionName1}" updated.`;
        assert.ok(results.messages.includes(expectedGit1UpdateMessage), `(${testName}) Success message for ${gitCollectionName1} expected. Got: ${JSON.stringify(results.messages)}`);
        
        const expectedLocalResyncMessage = `Collection "${localCollToUpdateName}" re-synced from local source.`;
        assert.ok(results.messages.includes(expectedLocalResyncMessage), `(${testName}) Success message for ${localCollToUpdateName} expected. Got: ${JSON.stringify(results.messages)}`);

        const expectedGit2AbortMessageStart = `Collection "${gitCollectionName2}" has local changes. Aborting update.`;
        assert.ok(results.messages.some(msg => msg.startsWith(expectedGit2AbortMessageStart)), `(${testName}) Abort message for ${gitCollectionName2} starting with "${expectedGit2AbortMessageStart}" expected.`);

        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
        throw error;
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(mockRemotesBase);
        await cleanupTestCollRoot(localSourcesBase);
    }
}

async function runUpdateTests(testRunStats, baseTestRunDir) {
    await testUpdateCollection(testRunStats, baseTestRunDir);
    await testUpdateAllCollections(testRunStats, baseTestRunDir);
}

module.exports = {
    runUpdateTests,
};
