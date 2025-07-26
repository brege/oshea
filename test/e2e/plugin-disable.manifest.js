// test/e2e/plugin-disable.manifest.js
const fs = require('fs-extra');
const path = require('path');
const stripAnsi = require('strip-ansi');

async function createDummyPlugin(pluginDir, pluginName) {
  await fs.ensureDir(pluginDir);
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
}

module.exports = [
  {
    describe: '3.8.1: (Happy Path) Successfully disables an enabled plugin',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection-for-disable');
      await createDummyPlugin(path.join(collDir, 'plugin-to-disable'), 'plugin-to-disable');
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
        const enabledManifest = await fs.readFile(enabledManifestPath, 'utf8');
        expect(enabledManifest).to.not.include('my-enabled-plugin');
      }
    },
  },
];

