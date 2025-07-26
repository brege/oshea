// test/e2e/plugin-enable.manifest.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// Helper to create a dummy plugin structure for testing CM commands
async function createDummyPlugin(pluginDir, pluginName) {
  await fs.ensureDir(pluginDir);
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
}

// Helper to create a fully compliant v1 plugin (for 3.7.2 happy path)
async function createWellFormedPlugin(pluginDir, pluginName) {
  await fs.ensureDir(path.join(pluginDir, '.contract/test'));
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\ndescription: Well-formed plugin.`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `---\ncli_help: |\n  Plugin: ${pluginName}\n---\n`);
  await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
  await fs.writeFile(path.join(pluginDir, '.contract/test', `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));');
  await fs.writeFile(path.join(pluginDir, '.contract', `${pluginName}.schema.json`), '{}');
}

// Helper to create a deliberately malformed plugin (for 3.7.3 sad path)
async function createMalformedPlugin(pluginDir, pluginName) {
  await fs.ensureDir(pluginDir);
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\ndescription: Malformed plugin.`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}


module.exports = [
  {
    describe: '3.7.1: (Happy Path) Successfully enables a plugin from a collection (bypassing validation)',
    setup: async (sandboxDir, harness) => {
      const collDir = path.join(sandboxDir, 'test-collection');
      await createDummyPlugin(path.join(collDir, 'plugin-to-enable'), 'plugin-to-enable');
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
      const pluginDir = path.join(collDir, pluginName);
      await createWellFormedPlugin(pluginDir, pluginName);
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
      const pluginDir = path.join(collDir, pluginName);
      await createMalformedPlugin(pluginDir, pluginName);
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
