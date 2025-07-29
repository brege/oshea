// test/runners/e2e/collection-add.manifest.js
const fs = require('fs-extra');
const path = require('path');

require('module-alias/register');
const { createDummyPluginPath } = require('@paths');
const { createDummyPlugin } = require(createDummyPluginPath);

module.exports = [
  {
    describe: '3.10.1: (Happy Path) Successfully adds a collection from a git URL',
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => [
      'collection',
      'add',
      'https://github.com/brege/md-to-pdf-plugins.git',
      '--name',
      'brege-plugins-test'
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Successfully cloned/i);

      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const collectionPath = path.join(collRootDir, 'collections', 'brege-plugins-test');
      const gitConfigPath = path.join(collectionPath, '.git', 'config');

      const collectionExists = await fs.pathExists(collectionPath);
      const gitConfigExists = await fs.pathExists(gitConfigPath);

      expect(collectionExists, 'Expected collection directory to be created').to.be.true;
      expect(gitConfigExists, 'Expected .git/config file to exist in cloned collection').to.be.true;
    },
  },
  {
    describe: '3.10.2: (Input Variation) Successfully adds a collection from a local directory path',
    setup: async (sandboxDir) => {
      const localCollPath = path.join(sandboxDir, 'my-local-collection-src');
      await createDummyPlugin('local-plugin', {
        destinationDir: localCollPath,
        baseFixture: 'valid-plugin'
      });
    },
    args: (sandboxDir) => [
      'collection',
      'add',
      path.join(sandboxDir, 'my-local-collection-src'),
      '--name',
      'my-local-collection'
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Successfully copied local source/i);

      const collRootDir = path.join(sandboxDir, '.cm-test-root');
      const collectionPath = path.join(collRootDir, 'collections', 'my-local-collection');
      const pluginConfigPath = path.join(collectionPath, 'local-plugin', 'local-plugin.config.yaml');

      const collectionExists = await fs.pathExists(collectionPath);
      const pluginFileExists = await fs.pathExists(pluginConfigPath);

      expect(collectionExists).to.be.true;
      expect(pluginFileExists).to.be.true;
    },
  },
  {
    describe: '3.10.3: (Sad Path) Fails with a non-zero exit code when the source is invalid',
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => [
      'collection',
      'add',
      'https://github.com/this/repository-does-not-exist-i-hope.git',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      expect(stderr + stdout).to.match(/Adding collection from source:/i);
    },
  },
];
