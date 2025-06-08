// dev/test/cm-tests/cm-test-helpers.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { METADATA_FILENAME, ENABLED_MANIFEST_FILENAME } = require('../../src/collections-manager/constants');

let testRunCounter = 0;

async function createTestCollRoot(baseTestRunDir) {
    if (!baseTestRunDir) {
        throw new Error("baseTestRunDir must be provided to createTestCollRoot in cm-test-helpers");
    }
    testRunCounter++;
    const uniqueTestCollRoot = path.join(baseTestRunDir, `cm_coll_root_run_${testRunCounter}_${Date.now()}`);
    await fs.mkdir(uniqueTestCollRoot, { recursive: true });
    process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE = uniqueTestCollRoot;
    if (process.env.DEBUG_CM_TESTS === 'true') {
        console.log(chalk.gray(`  [CM Helper] Created and set MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE: ${uniqueTestCollRoot}`));
    }
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
                    if (process.env.DEBUG_CM_TESTS === 'true') console.warn(chalk.yellow(`  [CM Helper] WARN: Attempt ${attempts} failed for ${collRootPath}. Retrying in 100ms... Error: ${e.message}`));
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (e) {
            if (process.env.DEBUG_CM_TESTS === 'true') console.warn(chalk.yellow(`  [CM Helper] WARN: Could not cleanup test coll root ${collRootPath} after ${maxAttempts} attempts: ${e.message}`));
        }
    }
    delete process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE;
    if (process.env.DEBUG_CM_TESTS === 'true' && collRootPath) {
         console.log(chalk.gray(`  [CM Helper] Cleaned up and unset MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE for: ${collRootPath}`));
    }
}

function _getGitCmdPrefix() {
    const gitGlobalConfig = process.env.GIT_CONFIG_GLOBAL ? `GIT_CONFIG_GLOBAL='${process.env.GIT_CONFIG_GLOBAL}'` : '';
    const gpgHome = process.env.GNUPGHOME ? `GNUPGHOME='${process.env.GNUPGHOME}'` : '';
    return `${gitGlobalConfig} ${gpgHome}`.trim();
}

async function setupLocalGitRepo(repoPath, initialFileName, initialFileContent, options = {}) {
    const { branchName = 'main', commitMessage = 'Initial commit' } = options;
    if (fss.existsSync(repoPath)) await fs.rm(repoPath, { recursive: true, force: true });
    await fs.mkdir(repoPath, { recursive: true });

    const cmdPrefix = _getGitCmdPrefix();

    execSync(`${cmdPrefix} git init --bare --initial-branch=${branchName}`, { cwd: repoPath, stdio: 'pipe' });

    const tempClonePath = path.join(os.tmpdir(), `cm_temp_clone_setup_helpers_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });

    try {
        execSync(`${cmdPrefix} git clone "${repoPath}" "${tempClonePath}"`, { stdio: 'pipe' });
        execSync(`${cmdPrefix} git config user.email "test@example.com"`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git config user.name "Test User"`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git config commit.gpgsign false`, { cwd: tempClonePath, stdio: 'pipe' });
        try {
            execSync(`${cmdPrefix} git checkout -b ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
        } catch (branchError) {
            try {
                execSync(`${cmdPrefix} git checkout ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
            } catch (finalCheckoutError) {
                 if (process.env.DEBUG_CM_TESTS === 'true') console.warn(chalk.yellow(`  [CM Helper] WARN: Git checkout ${branchName} in temp clone failed: ${finalCheckoutError.message}`));
            }
        }

        if (initialFileName && initialFileContent) {
            await fs.writeFile(path.join(tempClonePath, initialFileName), initialFileContent);
            execSync(`${cmdPrefix} git add .`, { cwd: tempClonePath, stdio: 'pipe' });
            execSync(`${cmdPrefix} git commit -m "${commitMessage}"`, { cwd: tempClonePath, stdio: 'pipe' });
        } else {
             execSync(`${cmdPrefix} git commit --allow-empty -m "${commitMessage}"`, { cwd: tempClonePath, stdio: 'pipe' });
        }
        execSync(`${cmdPrefix} git push origin ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git symbolic-ref HEAD refs/heads/${branchName}`, { cwd: repoPath, stdio: 'pipe' });

    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

async function addCommitToLocalGitRepo(bareRepoPath, newFileName, newFileContent, commitMessage, options = {}) {
    const { branchName = 'main' } = options;
    const tempClonePath = path.join(os.tmpdir(), `cm_temp_clone_commit_helpers_${Date.now()}`);
    if (fss.existsSync(tempClonePath)) await fs.rm(tempClonePath, { recursive: true, force: true });
    const cmdPrefix = _getGitCmdPrefix();

    try {
        execSync(`${cmdPrefix} git clone "${bareRepoPath}" "${tempClonePath}"`, { stdio: 'pipe' });
        execSync(`${cmdPrefix} git config user.email "test@example.com"`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git config user.name "Test User"`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git config commit.gpgsign false`, { cwd: tempClonePath, stdio: 'pipe' });

        try {
            execSync(`${cmdPrefix} git checkout ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
        } catch (e) {
            if (process.env.DEBUG_CM_TESTS === 'true') console.warn(chalk.yellow(`  [CM Helper] WARN: Checking out ${branchName} in temp clone for addCommit failed, trying to create. Error: ${e.message}`));
            execSync(`${cmdPrefix} git checkout -b ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
        }

        await fs.writeFile(path.join(tempClonePath, newFileName), newFileContent);
        execSync(`${cmdPrefix} git add .`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git commit -m "${commitMessage}"`, { cwd: tempClonePath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git push origin ${branchName}`, { cwd: tempClonePath, stdio: 'pipe' });
    } finally {
        if (fss.existsSync(tempClonePath)) {
            await fs.rm(tempClonePath, { recursive: true, force: true });
        }
    }
}

function getHeadCommit(repoPath) {
    const cmdPrefix = _getGitCmdPrefix();
    try {
        if (!fss.existsSync(path.join(repoPath, '.git')) && !fss.existsSync(path.join(repoPath, 'HEAD'))) {
             if (process.env.DEBUG_CM_TESTS === 'true') console.warn(chalk.yellow(`  [CM Helper] WARN: Not a git repository or no HEAD: ${repoPath}`));
             return null;
        }
        const commitHash = execSync(`${cmdPrefix} git rev-parse HEAD`, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });
        return commitHash.trim();
    } catch (e) {
        if (process.env.DEBUG_CM_TESTS === 'true') console.error(chalk.red(`  [CM Helper] ERROR: Could not get HEAD commit from ${repoPath}: ${e.message}`));
        return null;
    }
}

async function addUncommittedFileToClonedRepo(clonedRepoPath, fileName, fileContent) {
    try {
        await fs.writeFile(path.join(clonedRepoPath, fileName), fileContent);
        if (process.env.DEBUG_CM_TESTS === 'true') console.log(chalk.magenta(`  [CM Helper] DEBUG: Added uncommitted file ${fileName} to ${clonedRepoPath}`));
    } catch (e) {
        console.error(chalk.red(`  [CM Helper] ERROR: Could not add uncommitted file ${fileName} to ${clonedRepoPath}: ${e.message}`));
        throw e;
    }
}

async function addLocalCommitToClonedRepo(clonedRepoPath, fileName, fileContent, commitMessage) {
    const cmdPrefix = _getGitCmdPrefix();
    try {
        await fs.writeFile(path.join(clonedRepoPath, fileName), fileContent);
        execSync(`${cmdPrefix} git add .`, { cwd: clonedRepoPath, stdio: 'pipe' });
        execSync(`${cmdPrefix} git -c user.email="test@example.com" -c user.name="Test User" -c commit.gpgsign=false commit -m "${commitMessage}"`, { cwd: clonedRepoPath, stdio: 'pipe' });
        if (process.env.DEBUG_CM_TESTS === 'true') console.log(chalk.magenta(`  [CM Helper] DEBUG: Added local commit "${commitMessage}" in ${clonedRepoPath}`));
    } catch (e) {
        console.error(chalk.red(`  [CM Helper] ERROR: Could not add local commit in ${clonedRepoPath}: ${e.message}`));
        if (e.stderr) console.error(chalk.red(e.stderr.toString()));
        if (e.stdout) console.error(chalk.red(e.stdout.toString()));
        throw e;
    }
}

async function simulateForcePushToRemote(bareRepoPath, newInitialFileName, newInitialFileContent, options = {}) {
    const { branchName = 'main', commitMessage = 'Forced new history' } = options;
    if (process.env.DEBUG_CM_TESTS === 'true') console.log(chalk.magenta(`  [CM Helper] DEBUG: Simulating force push to ${bareRepoPath} on branch ${branchName} with file ${newInitialFileName}`));
    // This re-initializes the bare repo, effectively creating a new history.
    await setupLocalGitRepo(bareRepoPath, newInitialFileName, newInitialFileContent, { branchName, commitMessage });
}


module.exports = {
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
