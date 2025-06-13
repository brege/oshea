// test/e2e/collection-list.manifest.js
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    describe: '3.11.1: (Happy Path) Correctly lists all added collections',
    // This setup is a bit longer as it needs to add multiple collections to list
    setup: async (sandboxDir, harness) => {
      // 1. Add a collection from a live git URL
      await harness.runCli(['collection', 'add', 'https://github.com/brege/md-to-pdf-plugins.git']);
      
      // 2. Add a collection from a local path
      const localCollPath = path.join(sandboxDir, 'my-local-collection-src');
      await fs.ensureDir(localCollPath);
      await fs.writeFile(path.join(localCollPath, 'plugin.config.yaml'), 'description: test');
      await harness.runCli(['collection', 'add', localCollPath]);
    },
    args: (sandboxDir) => [
      'collection',
      'list',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // Check that the output contains the names of both added collections
      expect(stdout).to.match(/Collection Name: md-to-pdf-plugins/i);
      expect(stdout).to.match(/Collection Name: my-local-collection-src/i);
    },
  },
];
