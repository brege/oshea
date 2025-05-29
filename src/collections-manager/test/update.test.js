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
    addCommitToLocalGitRepo,
    getHeadCommit,
    addUncommittedFileToClonedRepo,
    addLocalCommitToClonedRepo,
    simulateForcePushToRemote
} = require('./test-helpers.js');

async function testUpdateCollection(testRunStats) {
    testRunStats.attempted++;
    const testName = "Update Collection (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });
    const localGitRepoPath = path.join(os.tmpdir(), `cm_local_git_repo_${Date.now()}.git`);
    const collectionName = 'git-collection-to-update';
    const collectionClonedPath = path.join(testCollRoot, collectionName);

    try {
        // --- Test: Update non-existent collection ---
        console.log(chalk.magenta("  Sub-test: Update non-existent collection"));
        const nonExistentResult = await manager.updateCollection('nonExistentCollectionForUpdate');
        assert.strictEqual(nonExistentResult.success, false, `(${testName}) Updating non-existent collection should fail`);
        assert.ok(nonExistentResult.message.includes('not found'), `(${testName}) Correct message for non-existent collection`);

        // --- Test: Update local-path collection (not Git-based) ---
        console.log(chalk.magenta("  Sub-test: Update local-path collection"));
        const localSourceDirName = `cm_local_update_source_${Date.now()}`;
        const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
        await fs.mkdir(localSourcePath, { recursive: true });
        await fs.writeFile(path.join(localSourcePath, "file.txt"), "local content");
        await manager.addCollection(localSourcePath, { name: 'local-update-coll' });

        const localUpdateResult = await manager.updateCollection('local-update-coll');
        assert.ok(localUpdateResult.success, `(${testName}) Updating local collection should report success (not an error)`);
        assert.strictEqual(localUpdateResult.message, `Collection "local-update-coll" not from a recognized Git source.`, `(${testName}) Correct message for non-Git local source`);
        await cleanupTestCollRoot(localSourcePath);

        // --- Test: Clean update (remote has new commits) ---
        console.log(chalk.magenta("  Sub-test: Clean update (remote has new commits)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial.txt', 'Version 1');
        await manager.addCollection(localGitRepoPath, { name: collectionName }); 
        
        let initialLocalCommit = getHeadCommit(collectionClonedPath);
        await addCommitToLocalGitRepo(localGitRepoPath, 'update.txt', 'Version 2', 'Second commit'); 
        
        const gitUpdateResult = await manager.updateCollection(collectionName);
        assert.ok(gitUpdateResult.success, `(${testName}) Clean update should succeed. Message: ${gitUpdateResult.message}`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'update.txt')), `(${testName}) Update file 'update.txt' should exist after clean update`);
        let updatedLocalCommit = getHeadCommit(collectionClonedPath);
        assert.notStrictEqual(initialLocalCommit, updatedLocalCommit, `(${testName}) Local commit should change after clean update`);
        const updatedFileContent = await fs.readFile(path.join(collectionClonedPath, 'update.txt'), 'utf8');
        assert.strictEqual(updatedFileContent, 'Version 2', `(${testName}) Content of update.txt should be 'Version 2'`);
        const updatedMeta = await manager._readCollectionMetadata(collectionName);
        assert.ok(updatedMeta.updated_on, `(${testName}) Metadata 'updated_on' should exist after clean update.`);
        await manager.removeCollection(collectionName, {force: true});

        // --- Test: Update with untracked local changes (should abort) ---
        console.log(chalk.magenta("  Sub-test: Update with untracked local changes (should abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial_untracked.txt', 'Untracked Test Base');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        await addUncommittedFileToClonedRepo(collectionClonedPath, 'untracked_file.txt', 'This is an untracked file.');
        
        const untrackedUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(untrackedUpdateResult.success, false, `(${testName}) Update with untracked files should fail (aborted). Message: ${untrackedUpdateResult.message}`);
        assert.ok(untrackedUpdateResult.message.includes('has local changes. Aborting update.'), `(${testName}) Correct abort message for untracked files`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'untracked_file.txt')), `(${testName}) Untracked file should still exist after aborted update`);
        await manager.removeCollection(collectionName, {force: true});

        // --- Test: Update with local commits (not pushed) (should abort) ---
        console.log(chalk.magenta("  Sub-test: Update with local commits (should abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'initial_local_commit.txt', 'Local Commit Test Base');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        await addLocalCommitToClonedRepo(collectionClonedPath, 'local_committed_file.txt', 'This is a local commit.', 'Local-only work');
        initialLocalCommit = getHeadCommit(collectionClonedPath); 

        await addCommitToLocalGitRepo(localGitRepoPath, 'remote_update_file.txt', 'Remote has new content', 'Remote update for local commit test');

        const localCommitUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(localCommitUpdateResult.success, false, `(${testName}) Update with local commits should abort. Message: ${localCommitUpdateResult.message}`);
        assert.ok(localCommitUpdateResult.message.includes('has local commits not present on the remote.'), `(${testName}) Correct abort message for local commits`);
        assert.strictEqual(getHeadCommit(collectionClonedPath), initialLocalCommit, `(${testName}) Local commit HEAD should not change after aborted update`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'local_committed_file.txt')), `(${testName}) Locally committed file should still exist`);
        assert.ok(!fss.existsSync(path.join(collectionClonedPath, 'remote_update_file.txt')), `(${testName}) Remote update file should NOT exist after aborted update`);
        await manager.removeCollection(collectionName, {force: true});

        // --- Test: Update after remote force push (should abort due to divergent history / local "ahead") ---
        console.log(chalk.magenta("  Sub-test: Update after remote force push (should currently abort)"));
        await setupLocalGitRepo(localGitRepoPath, 'original_history_file.txt', 'Commit A from original history');
        await manager.addCollection(localGitRepoPath, { name: collectionName });
        const commitBeforeForcePush = getHeadCommit(collectionClonedPath);

        await simulateForcePushToRemote(localGitRepoPath, 'new_forced_history_file.txt', 'Commit X from new history', { commitMessage: "Forced: New V2 History"});
        
        const forcePushUpdateResult = await manager.updateCollection(collectionName);
        assert.strictEqual(forcePushUpdateResult.success, false, `(${testName}) Update after force push should abort. Message: ${forcePushUpdateResult.message}`);
        assert.ok(forcePushUpdateResult.message.includes('has local commits not present on the remote'), `(${testName}) Correct abort message for force push scenario (diverged history)`);
        const commitAfterForcePushAttempt = getHeadCommit(collectionClonedPath);
        assert.strictEqual(commitAfterForcePushAttempt, commitBeforeForcePush, `(${testName}) Local commit HEAD should NOT change after aborted force push update`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'original_history_file.txt')), `(${testName}) File from old history should still be there after aborted update`);
        assert.ok(!fss.existsSync(path.join(collectionClonedPath, 'new_forced_history_file.txt')), `(${testName}) File from new force-pushed history should NOT exist after aborted update`);
        await manager.removeCollection(collectionName, {force: true});

        // --- Test: Update when only untracked .collection-metadata.yaml exists ---
        console.log(chalk.magenta("  Sub-test: Update with only untracked .collection-metadata.yaml"));
        await setupLocalGitRepo(localGitRepoPath, 'file_for_metadata_test_v1.txt', 'Content for metadata test v1');
        await manager.addCollection(localGitRepoPath, { name: collectionName }); 
        await addCommitToLocalGitRepo(localGitRepoPath, 'remote_change_meta_test.txt', 'Remote change for meta test', 'Commit for meta test');
        
        const metadataOnlyUpdateResult = await manager.updateCollection(collectionName);
        assert.ok(metadataOnlyUpdateResult.success, `(${testName}) Update with only untracked metadata file should succeed. Message: ${metadataOnlyUpdateResult.message}`);
        assert.ok(fss.existsSync(path.join(collectionClonedPath, 'remote_change_meta_test.txt')), `(${testName}) Remote change should be present after metadata-only update`);
        await manager.removeCollection(collectionName, {force: true});


        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localGitRepoPath);
    }
}

async function testUpdateAllCollections(testRunStats) {
    testRunStats.attempted++;
    const testName = "Update All Collections (Resilient)";
    console.log(chalk.blue(`\nRunning test: ${testName}...`));
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot, debug: process.env.DEBUG_CM === 'true' });

    const localGitRepoPath1 = path.join(os.tmpdir(), `cm_local_git_repo_all1_${Date.now()}.git`);
    const gitCollectionName1 = 'git-coll-all-1';
    await setupLocalGitRepo(localGitRepoPath1, 'file1_repo1.txt', 'Initial content for repo1');
    await manager.addCollection(localGitRepoPath1, { name: gitCollectionName1 });
    const collection1ClonedPath = path.join(testCollRoot, gitCollectionName1);

    const localSourceDirName = `cm_local_source_all_${Date.now()}`;
    const localSourcePath = path.join(os.tmpdir(), localSourceDirName);
    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, "local_file_in_all.txt"), "content");
    await manager.addCollection(localSourcePath, { name: 'local-coll-all' });

    const localGitRepoPath2 = path.join(os.tmpdir(), `cm_local_git_repo_all2_${Date.now()}.git`);
    const gitCollectionName2 = 'git-coll-all-2-local-changes';
    await setupLocalGitRepo(localGitRepoPath2, 'main_repo2.txt', 'Base for local changes test in repo2');
    await manager.addCollection(localGitRepoPath2, { name: gitCollectionName2 });
    const collection2ClonedPath = path.join(testCollRoot, gitCollectionName2);
    await addUncommittedFileToClonedRepo(collection2ClonedPath, 'untracked_in_coll2.txt', 'This should cause abort for this collection.');

    await addCommitToLocalGitRepo(localGitRepoPath1, 'update1_repo1.txt', 'Updated content for repo1', 'Update for repo1');

    try {
        const results = await manager.updateAllCollections();
        assert.ok(results.success, `(${testName}) updateAllCollections should report overall process success even if some are skipped. Messages: ${JSON.stringify(results.messages)}`);

        assert.ok(fss.existsSync(path.join(collection1ClonedPath, 'update1_repo1.txt')), `(${testName}) Git collection ${gitCollectionName1} should have 'update1_repo1.txt'`);
        const updatedMeta1 = await manager._readCollectionMetadata(gitCollectionName1);
        assert.ok(updatedMeta1.updated_on, `(${testName}) Metadata for ${gitCollectionName1} should have updated_on`);

        assert.ok(fss.existsSync(path.join(collection2ClonedPath, 'untracked_in_coll2.txt')), `(${testName}) Untracked file in ${gitCollectionName2} should still exist`);
        const meta2 = await manager._readCollectionMetadata(gitCollectionName2);
        assert.strictEqual(meta2.updated_on, undefined, `(${testName}) ${gitCollectionName2} should NOT have updated_on as update was aborted`);

        const localCollPath = path.join(testCollRoot, 'local-coll-all');
        const localMetaContent = await fs.readFile(path.join(localCollPath, METADATA_FILENAME), 'utf8');
        const localMetaData = yaml.load(localMetaContent);
        assert.strictEqual(localMetaData.updated_on, undefined, `(${testName}) Local collection 'local-coll-all' metadata should not have updated_on`);

        const expectedGit1UpdateMessage = `Collection "${gitCollectionName1}" updated.`;
        assert.ok(results.messages.includes(expectedGit1UpdateMessage), `(${testName}) Success message for ${gitCollectionName1} expected. Got: ${JSON.stringify(results.messages)}`);
        
        const expectedGit2AbortMessageStart = `Collection "${gitCollectionName2}" has local changes. Aborting update.`;
        assert.ok(results.messages.some(msg => msg.startsWith(expectedGit2AbortMessageStart)), `(${testName}) Abort message for ${gitCollectionName2} starting with "${expectedGit2AbortMessageStart}" expected. Got: ${JSON.stringify(results.messages)}`);

        const expectedLocalSkipMessage = `Skipping local-coll-all: Not a Git-based collection (source: ${localSourcePath}).`;
        // More robust check for the skip message
        const foundSkipMsg = results.messages.find(msg => {
            // Normalize paths for comparison to handle potential OS differences like trailing slashes
            // though in this specific case, both should be direct outputs.
            // Primarily, this is to be absolutely sure about the string content.
            const normalize = (s) => s.replace(/\\/g, '/').replace(/\/$/, '');
            return normalize(msg) === normalize(expectedLocalSkipMessage);
        });
        if (!foundSkipMsg && process.env.DEBUG_CM === 'true') { // Log only in debug mode
            console.log(chalk.yellow("DEBUG (UpdateAllCollections): Expected skip message for local-coll-all not found via '===' comparison."));
            console.log(chalk.yellow("DEBUG: Expected normalized:"), JSON.stringify(expectedLocalSkipMessage.replace(/\\/g, '/').replace(/\/$/, '')));
            results.messages.forEach((m, i) => console.log(chalk.yellow(`DEBUG: Actual[${i}] normalized:`), JSON.stringify(m.replace(/\\/g, '/').replace(/\/$/, ''))));
        }
        assert.ok(foundSkipMsg !== undefined, `(${testName}) Skip message for 'local-coll-all' strictly matching '${expectedLocalSkipMessage}' expected. Review DEBUG logs if this fails. Messages: ${JSON.stringify(results.messages)}`);


        console.log(chalk.green(`  PASSED: ${testName}`));
        testRunStats.passed++;
    } catch (error) {
        console.error(chalk.red(`  FAILED: ${testName}`), error);
        if (error.stack) console.error(error.stack);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await cleanupTestCollRoot(localGitRepoPath1);
        await cleanupTestCollRoot(localGitRepoPath2);
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
