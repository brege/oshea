// test/e2e/plugin-enable.manifest.js
const fs = require('fs-extra');
const path = require('path');

async function createDummyPlugin(pluginDir, pluginName) {
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
}

module.exports = [
  {
    describe: '3.7.1: (Happy Path) Successfully enables a plugin from a collection',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection');
      await createDummyPlugin(path.join(collDir, 'plugin-to-enable'), 'plugin-to-enable');
      await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection']);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'test-collection/plugin-to-enable',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      console.log(stdout);
      console.log(stderr);
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/enabled successfully as "plugin-to-enable"/i);
    },
  },
];
