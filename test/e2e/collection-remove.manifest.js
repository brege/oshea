// test/e2e/collection-remove.manifest.js
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    describe: '3.12.1: (Happy Path) Successfully removes an added collection',
    setup: async (sandboxDir, harness) => {
      const localCollPath = path.join(sandboxDir, 'collection-to-remove');
      await fs.ensureDir(localCollPath);
      await fs.writeFile(path.join(localCollPath, 'plugin.config.yaml'), 'description: test');

      // Add the collection first
      await harness.runCli(['collection', 'add', localCollPath]);
    },
    args: (sandboxDir) => [
      'collection',
      'remove',
      'collection-to-remove', // Use the name derived by the 'add' command
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Collection Name: collection-to-remove/i);

      // Verify the directory is gone from the sandboxed collections root
      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const collectionPath = path.join(collRootDir, 'collection-to-remove');
      const collectionExists = await fs.pathExists(collectionPath);
      expect(collectionExists).to.be.false;
    },
  },
];
