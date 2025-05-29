// dev/src/collections-manager/test/test-helpers.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { execSync } = require('child_process'); 
const chalk = require('chalk'); 

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
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                try {
                    await fs.rm(collRootPath, { recursive: true, force: true });
                    break; 
                } catch (e) {
                    attempts++;
                    if (attempts >= maxAttempts) throw e; 
                    if (process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN (cleanupTestCollRoot): Attempt ${attempts} failed for ${collRootPath}. Retrying in 100ms... Error: ${e.message}`));
                    await new Promise(resolve => setTimeout(resolve, 100)); 
                }
            }
        } catch (e) {
             if (process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN (cleanupTestCollRoot): Could not cleanup test coll root ${collRootPath} after ${maxAttempts} attempts: ${e.message}`));
        }
    }
}


async function setupLocalGitRepo(repoPath, initialFileName, initialFileContent, options = {}) {
    const { branchName = 'main', commitMessage = 'Initial commit' } = options;
    if (fss.existsSync(repoPath)) await fs.rm(repoPath, { recursive: true, force: true });
    await fs.mkdir(repoPath, { recursive: true });
    execSync(`git init --bare --initial-branch=${branchName}`, { cwd: repoPath });

    const tempClonePath = path.join(os.tmpdir(), `temp_clone_setup_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`git clone "${repoPath}" "${tempClonePath}"`);
        // Explicitly set config for the temp clone used to make the initial commit
        execSync('git config user.email "test@example.com"', { cwd: tempClonePath });
        execSync('git config user.name "Test User"', { cwd: tempClonePath });
        execSync('git config commit.gpgsign false', { cwd: tempClonePath });
        // Ensure the branch exists and is checked out in the temp clone
        try {
            execSync(`git checkout -b ${branchName}`, { cwd: tempClonePath });
        } catch (branchError) {
            // If checkout -b fails (e.g., branch already exists from clone), just checkout
            try {
                execSync(`git checkout ${branchName}`, { cwd: tempClonePath });
            } catch (finalCheckoutError) {
                 if (process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN (test-helpers): Git checkout ${branchName} in temp clone failed: ${finalCheckoutError.message}`));
            }
        }

        if (initialFileName && initialFileContent) {
            await fs.writeFile(path.join(tempClonePath, initialFileName), initialFileContent);
            execSync('git add .', { cwd: tempClonePath });
            execSync(`git commit -m "${commitMessage}"`, { cwd: tempClonePath });
        } else { 
             execSync(`git commit --allow-empty -m "${commitMessage}"`, { cwd: tempClonePath });
        }
        execSync(`git push origin ${branchName}`, { cwd: tempClonePath });
        
        execSync(`git symbolic-ref HEAD refs/heads/${branchName}`, { cwd: repoPath });

    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

async function addCommitToLocalGitRepo(bareRepoPath, newFileName, newFileContent, commitMessage, options = {}) {
    const { branchName = 'main' } = options;
    const tempClonePath = path.join(os.tmpdir(), `temp_clone_commit_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`git clone "${bareRepoPath}" "${tempClonePath}"`);
        // Explicitly set config for this temp clone
        execSync('git config user.email "test@example.com"', { cwd: tempClonePath });
        execSync('git config user.name "Test User"', { cwd: tempClonePath });
        execSync('git config commit.gpgsign false', { cwd: tempClonePath });
        
        try {
            execSync(`git checkout ${branchName}`, { cwd: tempClonePath });
        } catch (e) {
            if (process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN (test-helpers): Checking out ${branchName} in temp clone for addCommit failed, trying to create. Error: ${e.message}`));
            execSync(`git checkout -b ${branchName}`, { cwd: tempClonePath });
        }

        await fs.writeFile(path.join(tempClonePath, newFileName), newFileContent);
        execSync('git add .', { cwd: tempClonePath });
        execSync(`git commit -m "${commitMessage}"`, { cwd: tempClonePath });
        execSync(`git push origin ${branchName}`, { cwd: tempClonePath });
    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

function getHeadCommit(repoPath) {
    try {
        if (!fss.existsSync(path.join(repoPath, '.git')) && !fss.existsSync(path.join(repoPath, 'HEAD'))) {
             if (process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN (test-helpers): Not a git repository or no HEAD: ${repoPath}`));
             return null; 
        }
        const commitHash = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf8' });
        return commitHash.trim();
    } catch (e) {
        if (process.env.DEBUG_CM === 'true') console.error(chalk.red(`  ERROR (test-helpers): Could not get HEAD commit from ${repoPath}: ${e.message}`));
        return null;
    }
}

async function addUncommittedFileToClonedRepo(clonedRepoPath, fileName, fileContent) {
    try {
        await fs.writeFile(path.join(clonedRepoPath, fileName), fileContent);
        if (process.env.DEBUG_CM === 'true') console.log(chalk.magenta(`  DEBUG (test-helpers): Added uncommitted file ${fileName} to ${clonedRepoPath}`));
    } catch (e) {
        console.error(chalk.red(`  ERROR (test-helpers): Could not add uncommitted file ${fileName} to ${clonedRepoPath}: ${e.message}`));
        throw e;
    }
}

async function addLocalCommitToClonedRepo(clonedRepoPath, fileName, fileContent, commitMessage) {
     try {
        // Local config set here might not always be picked up by execSync's commit in all shell environments
        // So, use -c for the commit command itself as a more robust method.
        // execSync('git config user.email "test@example.com"', { cwd: clonedRepoPath });
        // execSync('git config user.name "Test User"', { cwd: clonedRepoPath });
        // execSync('git config commit.gpgsign false', { cwd: clonedRepoPath });

        await fs.writeFile(path.join(clonedRepoPath, fileName), fileContent);
        execSync('git add .', { cwd: clonedRepoPath });
        // Force config directly on the commit command line for this helper
        execSync(`git -c user.email="test@example.com" -c user.name="Test User" -c commit.gpgsign=false commit -m "${commitMessage}"`, { cwd: clonedRepoPath });
        if (process.env.DEBUG_CM === 'true') console.log(chalk.magenta(`  DEBUG (test-helpers): Added local commit "${commitMessage}" in ${clonedRepoPath}`));
    } catch (e) {
        console.error(chalk.red(`  ERROR (test-helpers): Could not add local commit in ${clonedRepoPath}: ${e.message}`));
        if (e.stderr) console.error(chalk.red(e.stderr.toString()));
        if (e.stdout) console.error(chalk.red(e.stdout.toString()));
        throw e;
    }
}

async function simulateForcePushToRemote(bareRepoPath, newInitialFileName, newInitialFileContent, options = {}) {
    const { branchName = 'main', commitMessage = 'Forced new history' } = options;
    if (process.env.DEBUG_CM === 'true') console.log(chalk.magenta(`  DEBUG (test-helpers): Simulating force push to ${bareRepoPath} on branch ${branchName} with file ${newInitialFileName}`));
    // Re-initialize the bare repo with new history
    await setupLocalGitRepo(bareRepoPath, newInitialFileName, newInitialFileContent, { branchName, commitMessage });
}


module.exports = {
    TEST_COLL_ROOT_BASE,
    METADATA_FILENAME,
    ENABLED_MANIFEST_FILENAME,
    createTestCollRoot,
    cleanupTestCollRoot,
    setupLocalGitRepo,
    addCommitToLocalGitRepo,
    getHeadCommit, 
    addUncommittedFileToClonedRepo, 
    addLocalCommitToClonedRepo, 
    simulateForcePushToRemote, 
};
