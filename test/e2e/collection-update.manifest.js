// test/e2e/collection-update.manifest.js
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Helper to set up a local git "remote" and a collection cloned from it
async function setupLocalGitCollection(sandboxDir, harness, collectionName) {
    const remoteRepoPath = path.join(sandboxDir, `${collectionName}-remote.git`);
    const initialClonePath = path.join(sandboxDir, `${collectionName}-clone`);

    // 1. Create a bare git repo to act as the remote
    console.log(`[CI DEBUG] Initializing bare remote repo at: ${remoteRepoPath}`);
    execSync(`git init --bare "${remoteRepoPath}"`);

    // 2. Clone it, add a file, and push to create the initial state
    console.log(`[CI DEBUG] Cloning remote repo to: ${initialClonePath}`);
    execSync(`git clone "${remoteRepoPath}" "${initialClonePath}"`);
    await fs.writeFile(path.join(initialClonePath, 'v1.txt'), 'version 1');

    console.log(`[CI DEBUG] Setting local git config for: ${initialClonePath}`);
    execSync('git config user.name "Test" && git config user.email "test@example.com" && git config commit.gpgsign false', { cwd: initialClonePath });
    
    console.log(`[CI DEBUG] Committing v1 to local clone...`);
    execSync('git add . && git commit -m "v1"', { cwd: initialClonePath });

    // --- START MODIFICATION ---
    console.log(`[CI DEBUG] Renaming default branch to 'main' to ensure consistency...`);
    execSync('git branch -m main', { cwd: initialClonePath });
    // --- END MODIFICATION ---

    console.log(`[CI DEBUG] Pushing v1 to remote...`);
    execSync('git push -u origin main', { cwd: initialClonePath });

    // 3. Add this initial clone as a collection to the CM
    console.log(`[CI DEBUG] Adding collection '${collectionName}' to CollectionsManager via CLI...`);
    await harness.runCli(['collection', 'add', remoteRepoPath, '--name', collectionName]);

    // 4. Update the "remote" with a new version
    console.log(`[CI DEBUG] Pulling from remote to ensure clone is up to date...`);
    execSync('git pull origin main', { cwd: initialClonePath }); // Ensure it's up to date
    await fs.writeFile(path.join(initialClonePath, 'v2.txt'), 'version 2');

    console.log(`[CI DEBUG] Committing v2 to local clone...`);
    execSync('git add . && git commit -m "v2"', { cwd: initialClonePath });

    console.log(`[CI DEBUG] Pushing v2 to remote...`);
    execSync('git push origin main', { cwd: initialClonePath });
}


module.exports = [
  {
    describe: '3.13.1: (Happy Path) Successfully runs the update process on all collections',
    setup: async (sandboxDir, harness) => {
        await setupLocalGitCollection(sandboxDir, harness, 'collection-to-update-all');
    },
    args: (sandboxDir) => [
      'collection',
      'update',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Successfully updated collection "collection-to-update-all"/i);
      
      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const updatedFile = path.join(collRootDir, 'collection-to-update-all', 'v2.txt');
      const fileExists = await fs.pathExists(updatedFile);
      expect(fileExists, 'Expected updated file v2.txt to exist').to.be.true;
    },
  },
  {
    describe: '3.13.2: (Key Option) Successfully runs the update process on a single named collection',
    setup: async (sandboxDir, harness) => {
        await setupLocalGitCollection(sandboxDir, harness, 'collection-to-update-one');
    },
    args: (sandboxDir) => [
      'collection',
      'update',
      'collection-to-update-one',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Successfully updated collection "collection-to-update-one"/i);

      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const updatedFile = path.join(collRootDir, 'collection-to-update-one', 'v2.txt');
      const fileExists = await fs.pathExists(updatedFile);
      expect(fileExists, 'Expected updated file v2.txt to exist').to.be.true;
    },
  },
  {
    describe: "3.14.1: (Alias) The 'update' alias successfully runs the collection update process",
    setup: async (sandboxDir, harness) => {
        await setupLocalGitCollection(sandboxDir, harness, 'collection-to-update-alias');
    },
    args: (sandboxDir) => [
      'update', // Use the alias
      'collection-to-update-alias',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Successfully updated collection "collection-to-update-alias"/i);

      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const updatedFile = path.join(collRootDir, 'collection-to-update-alias', 'v2.txt');
      const fileExists = await fs.pathExists(updatedFile);
      expect(fileExists, 'Expected updated file v2.txt to exist').to.be.true;
    },
  },
];
