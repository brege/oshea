// test/runners/e2e/plugin-disable.manifest.js
const fs = require('fs-extra');
const path = require('path');
const stripAnsi = require('strip-ansi');

require('module-alias/register');
const { createDummyPluginPath } = require('@paths');
const { createDummyPlugin } = require(createDummyPluginPath);

module.exports = [
  {
    describe: '3.8.1: (Happy Path) Successfully disables an enabled plugin',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection-for-disable');

      await createDummyPlugin('plugin-to-disable', {
        destinationDir: collDir,
        baseFixture: 'valid-plugin'
      });

      await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection-for-disable']);

      await harness.runCli([
        'plugin',
        'enable',
        'test-collection-for-disable/plugin-to-disable',
        '--name',
        'my-enabled-plugin',
        '--bypass-validation'
      ]);
    },
    args: (sandboxDir) => [
      'plugin',
      'disable',
      'my-enabled-plugin',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stripAnsi(stdout)).to.match(/Attempting to disable plugin/i);

      // Optionally, check that the plugin is no longer in the enabled manifest
      const enabledManifestPath = path.join(sandboxDir, '.cm-test-root', 'enabled.yaml');
      if (await fs.pathExists(enabledManifestPath)) {
        const enabledManifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        expect(enabledManifestContent).to.not.include('my-enabled-plugin');
      }
    },
  },
];

