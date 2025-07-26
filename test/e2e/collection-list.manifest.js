// test/e2e/collection-list.manifest.js
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    describe: '3.11.1: (Happy Path) Correctly lists all added collections',
    setup: async (sandboxDir, harness) => {
      await harness.runCli(['collection', 'add', 'https://github.com/brege/md-to-pdf-plugins.git']);
      const localCollPath = path.join(sandboxDir, 'my-local-collection-src');
      await fs.ensureDir(localCollPath);
      await fs.writeFile(path.join(localCollPath, 'plugin.config.yaml'), 'description: test');
      await harness.runCli(['collection', 'add', localCollPath]);
    },
    args: (sandboxDir) => [
      'collection',
      'list',
      'names',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Collection Name: md-to-pdf-plugins/i);
      expect(stdout).to.match(/Collection Name: my-local-collection-src/i);
    },
  },
];
