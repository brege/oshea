// test/runners/e2e/plugin-enable.manifest.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

require('module-alias/register');
const { createDummyPluginPath } = require('@paths');
const { createDummyPlugin } = require(createDummyPluginPath);

module.exports = [
  {
    describe: '3.7.1: (Happy Path) Successfully enables a plugin from a collection (bypassing validation)',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection');

      await createDummyPlugin('plugin-to-enable', {
        destinationDir: collDir,
        baseFixture: 'valid-plugin'
      });

      await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection']);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'test-collection/plugin-to-enable',
      '--bypass-validation',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Attempting to enable plugin/i);
      // Validation bypass message converted to debug level
    },
  },
  {
    describe: '3.7.2: (Happy Path) The `plugin enable` command successfully enables a valid plugin (with validation)',
    setup: async (sandboxDir, harness) => {
      const collectionName = 'valid-coll';
      const pluginName = 'valid-plugin';
      const collDir = path.join(sandboxDir, collectionName);

      await createDummyPlugin(pluginName, {
        destinationDir: collDir,
        baseFixture: 'valid-plugin'
      });

      await harness.runCli(['collection', 'add', collDir, '--name', collectionName]);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'valid-coll/valid-plugin',
      // --bypass-validation is intentionally absent or implicitly false
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Attempting to enable plugin/i);
      const enabledManifestPath = path.join(sandboxDir, '.cm-test-root', 'enabled.yaml');
      const enabledManifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
      expect(enabledManifest.enabled_plugins).to.be.an('array').with.lengthOf(1);
      expect(enabledManifest.enabled_plugins[0].invoke_name).to.equal('valid-plugin');
    },
  },
  {
    describe: '3.7.3: (Sad Path) The `plugin enable` command fails to enable an invalid plugin and reports validation errors',
    setup: async (sandboxDir, harness) => {
      const collectionName = 'invalid-coll';
      const pluginName = 'invalid-plugin';
      const collDir = path.join(sandboxDir, collectionName);

      await createDummyPlugin(pluginName, {
        destinationDir: collDir,
        baseFixture: 'valid-plugin',
        breakage: ['missing-handler']
      });

      await harness.runCli(['collection', 'add', collDir, '--name', collectionName]);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'invalid-coll/invalid-plugin',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      const output = (stderr + stdout).toLowerCase();

      expect(output).to.include('missing required file');
      expect(output).to.include('index.js');
      expect(output).to.include('plugin validation failed');
      expect(output).to.include('invalid-plugin');

      const enabledManifestPath = path.join(sandboxDir, '.cm-test-root', 'enabled.yaml');
      const enabledManifestExists = await fs.pathExists(enabledManifestPath);
      if (enabledManifestExists) {
        const enabledManifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
        expect(enabledManifest.enabled_plugins).to.be.an('array').that.is.empty;
      }
    },
  },

];
