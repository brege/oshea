// test/e2e/plugin-enable.manifest.js
const fs = require('fs-extra');
const path = require('path');

// FIX: This helper was creating an invalid plugin config. It is now updated
// to produce a configuration that meets the v1 contract.
async function createSimplePlugin(pluginDir, pluginName) {
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}

// This helper is used by the 3.7.2 test and is already correct.
async function createValidPlugin(pluginDir, pluginName) {
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}

// This helper creates an invalid plugin and is correct for its purpose.
async function createInvalidPlugin(pluginDir, pluginName) {
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}


module.exports = [
  {
    describe: '3.7.1: (Happy Path) Successfully enables a plugin from a collection',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection-371');
      await createSimplePlugin(path.join(collDir, 'plugin-to-enable-371'), 'plugin-to-enable-371');
      await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection-371']);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'test-collection-371/plugin-to-enable-371',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/enabled successfully as "plugin-to-enable-371"/i);
    },
  },
  {
    describe: '3.7.2: (Happy Path) Successfully enables a valid plugin, passing the pre-enable validation check',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection-372');
      await createValidPlugin(path.join(collDir, 'plugin-to-enable-372'), 'plugin-to-enable-372');
      await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection-372']);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'test-collection-372/plugin-to-enable-372',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Validation passed/i);
      expect(stdout).to.match(/enabled successfully as "plugin-to-enable-372"/i);
    },
  },
  {
    describe: '3.7.3: (Sad Path) Fails to enable an invalid plugin and reports validation errors',
    setup: async (sandboxDir, harness) => {
        const collDir = path.join(sandboxDir, 'invalid-collection');
        await createInvalidPlugin(path.join(collDir, 'invalid-plugin'), 'invalid-plugin');
        await harness.runCli(['collection', 'add', collDir, '--name', 'invalid-collection']);
    },
    args: (sandboxDir) => [
        'plugin',
        'enable',
        'invalid-collection/invalid-plugin',
    ],
    assert: async (result, sandboxDir, expect) => {
        expect(result.exitCode).to.equal(1);
        expect(result.stderr).to.match(/failed validation and cannot be enabled/i);

        const harness = new (require('./harness.js')).TestHarness();
        harness.sandboxDir = sandboxDir; 
        const listResult = await harness.runCli(['plugin', 'list', '--enabled']);
        
        expect(listResult.exitCode).to.equal(0);
        expect(listResult.stdout).to.not.match(/invalid-plugin/i);
    },
  },
];
