// test/e2e/sad-paths.manifest.js
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Helper to set up a local git "remote" and a collection cloned from it
async function setupLocalGitCollectionWithLocalChange(harness, collectionName) {
  const sandboxDir = harness.sandboxDir;
  const remoteRepoPath = path.join(sandboxDir, `${collectionName}-remote.git`);
  const initialClonePath = path.join(sandboxDir, `${collectionName}-clone`);

  // 1. Create a bare git repo to act as the remote
  execSync(`git init --bare "${remoteRepoPath}"`);
  execSync('git symbolic-ref HEAD refs/heads/main', { cwd: remoteRepoPath });

  // 2. Clone it, add a file, and push to create the initial state
  execSync(`git clone "${remoteRepoPath}" "${initialClonePath}"`);
  await fs.writeFile(path.join(initialClonePath, 'v1.txt'), 'version 1');
  execSync('git config user.name "Test" && git config user.email "test@example.com" && git config commit.gpgsign false', { cwd: initialClonePath });
  execSync('git add . && git commit -m "v1"', { cwd: initialClonePath });
  execSync('git push origin main', { cwd: initialClonePath });

  // 3. Add this initial clone as a collection to the CM
  await harness.runCli(['collection', 'add', remoteRepoPath, '--name', collectionName], { useFactoryDefaults: false });

  // 4. Make a local, uncommitted change to the *managed* collection
  const managedCollectionPath = path.join(harness.collRootDir, collectionName);
  await fs.writeFile(path.join(managedCollectionPath, 'local-uncommitted-change.txt'), 'This file is not committed.');
}


module.exports = [
  {
    describe: '4.3.2: (Sad Path) `plugin create --from` fails with invalid source',
    useFactoryDefaults: false,
    setup: async (sandboxDir) => {
      const invalidSourceDir = path.join(sandboxDir, 'invalid-source-plugin');
      await fs.ensureDir(invalidSourceDir);
    },
    args: (sandboxDir) => [
      'plugin',
      'create',
      'new-plugin-from-bad-source',
      '--from',
      path.join(sandboxDir, 'invalid-source-plugin'),
      '--target-dir',
      sandboxDir
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode, 'Expected command to fail with a non-zero exit code').to.equal(1);
      expect((stderr + stdout)).to.match(/Config file \(.config.yaml or \.yaml\) not found in source plugin directory/i);
    },
  },
  {
    describe: '4.3.1: (Sad Path) `collection update` fails with local uncommitted changes',
    useFactoryDefaults: false,
    setup: async (sandboxDir, harness) => {
      await setupLocalGitCollectionWithLocalChange(harness, 'dirty-collection');
    },
    args: (sandboxDir) => [
      'collection',
      'update',
      'dirty-collection',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode, 'Expected command to fail due to local changes').to.equal(1);
      expect((stderr + stdout)).to.match(/Attempting to update collection/i);
    },
  },

];
