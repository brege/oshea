// dev/src/collections-manager/test/test-helpers.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { execSync } = require('child_process'); // Needed for Git test setup

const TEST_COLL_ROOT_BASE = path.join(os.tmpdir(), 'cm_test_coll_root');
const METADATA_FILENAME = '.collection-metadata.yaml';
const ENABLED_MANIFEST_FILENAME = 'enabled.yaml';

// Counter to ensure unique test roots if multiple test files run in parallel
// or if a single test file needs multiple isolated roots.
// For now, assuming serial execution orchestrated by the main runner.
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

    const tempClonePath = path.join(os.tmpdir(), `temp_clone_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`git clone "${repoPath}" "${tempClonePath}"`);
        execSync('git config user.email "test@example.com"', { cwd: tempClonePath });
        execSync('git config user.name "Test User"', { cwd: tempClonePath });
        // Ensure main branch exists before trying to write file and commit
        // Some Git versions might not create 'master' or 'main' on clone of bare repo.
        // A common practice is to create an initial commit with a default branch.
        try {
            execSync('git checkout -b main', { cwd: tempClonePath });
        } catch (branchError) {
            // If 'main' already exists or some other issue, try to ensure we are on it or default.
            // This might need refinement based on git version specifics.
            // For now, assume checkout -b main works or is not strictly needed if default branch is picked up.
             console.warn(`  Git checkout -b main might have had issues or main already exists: ${branchError.message}`);
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
    TEST_COLL_ROOT_BASE, // Export if needed by the main runner for global setup/cleanup
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo,
    addCommitToLocalGitRepo,
};
