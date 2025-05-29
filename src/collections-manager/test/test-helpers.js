// dev/src/collections-manager/test/test-helpers.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const TEST_COLL_ROOT_BASE = path.join(os.tmpdir(), 'cm_test_coll_root');
const METADATA_FILENAME = '.collection-metadata.yaml';
const ENABLED_MANIFEST_FILENAME = 'enabled.yaml';

let testRunCounter = 0;

async function createTestCollRoot() {
    testRunCounter++;
    const uniqueTestCollRoot = path.join(TEST_COLL_ROOT_BASE, `run_${testRunCounter}_${Date.now()}`);
    await fs.mkdir(uniqueTestCollRoot, { recursive: true });
    return uniqueTestCollRoot;
}

async function cleanupTestCollRoot(collRootPath) {
    if (collRootPath && fss.existsSync(collRootPath)) {
        try {
            await fs.rm(collRootPath, { recursive: true, force: true });
        } catch (e) {
            // console.warn(`Could not cleanup test coll root ${collRootPath}: ${e.message}`);
        }
    }
}

async function setupLocalGitRepo(repoPath, initialFileName, initialFileContent) {
    if (fss.existsSync(repoPath)) await fs.rm(repoPath, { recursive: true, force: true });
    await fs.mkdir(repoPath, { recursive: true });
    execSync('git init --bare', { cwd: repoPath });

    const tempClonePath = path.join(os.tmpdir(), `temp_clone_setup_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`git clone "${repoPath}" "${tempClonePath}"`);
        execSync('git config user.email "test@example.com"', { cwd: tempClonePath });
        execSync('git config user.name "Test User"', { cwd: tempClonePath });
        execSync('git config commit.gpgsign false', { cwd: tempClonePath }); // Disable GPG signing for commits

        try {
            execSync('git checkout -b main', { cwd: tempClonePath });
        } catch (branchError) {
             console.warn(chalk.yellow(`  WARN (test-helpers): Git checkout -b main might have had issues or main already exists: ${branchError.message}`));
        }
        await fs.writeFile(path.join(tempClonePath, initialFileName), initialFileContent);
        execSync('git add .', { cwd: tempClonePath });
        execSync('git commit -m "Initial commit"', { cwd: tempClonePath });
        execSync('git push origin main', { cwd: tempClonePath });
    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

async function addCommitToLocalGitRepo(bareRepoPath, newFileName, newFileContent, commitMessage) {
    const tempClonePath = path.join(os.tmpdir(), `temp_clone_commit_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`git clone "${bareRepoPath}" "${tempClonePath}"`);
        execSync('git config user.email "test@example.com"', { cwd: tempClonePath });
        execSync('git config user.name "Test User"', { cwd: tempClonePath });
        execSync('git config commit.gpgsign false', { cwd: tempClonePath }); // Disable GPG signing for commits

        // It's good practice to ensure you're on a branch, though clone of bare usually sets up main/master
        // If not, the push might need explicit branch target. Assuming 'main' from setup.
        await fs.writeFile(path.join(tempClonePath, newFileName), newFileContent);
        execSync('git add .', { cwd: tempClonePath });
        execSync(`git commit -m "${commitMessage}"`, { cwd: tempClonePath });
        execSync('git push origin main', { cwd: tempClonePath });
    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

module.exports = {
    TEST_COLL_ROOT_BASE,
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo,
    addCommitToLocalGitRepo,
};
