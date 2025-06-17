// test/e2e/plugin-enable.manifest.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml'); // Added for checking enabled.yaml content in assertions

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
    // A minimal passing in-situ test (important for validation to be 'VALID')
    await fs.writeFile(path.join(pluginDir, '.contract/test', `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));');
    await fs.writeFile(path.join(pluginDir, '.contract', `${pluginName}.schema.json`), '{}');
}

// Helper to create a deliberately malformed plugin (for 3.7.3 sad path)
async function createMalformedPlugin(pluginDir, pluginName) {
    // Missing index.js is a critical validation error
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\ndescription: Malformed plugin.`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    // No index.js, no contract/test, no schema
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
      expect(stdout).to.match(/enabled successfully as "plugin-to-enable"/i);
      expect(stdout).to.match(/Validation bypassed for plugin 'plugin-to-enable' \(--bypass-validation flag detected\)/i); // Assert bypass message
    },
  },
  {
    describe: '3.7.2: (Happy Path) The `plugin enable` command successfully enables a valid plugin (with validation)',
    setup: async (sandboxDir, harness) => {
      const collectionName = 'valid-coll';
      const pluginName = 'valid-plugin';
      const collDir = path.join(sandboxDir, collectionName);
      const pluginDir = path.join(collDir, pluginName);
      await createWellFormedPlugin(pluginDir, pluginName); // Create a valid plugin
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
      expect(stdout).to.match(/Running validation for plugin 'valid-plugin' before enabling/i);
      expect(stdout).to.match(/Plugin 'valid-plugin' passed validation/i);
      expect(stdout).to.match(/Plugin "valid-coll\/valid-plugin" enabled successfully as "valid-plugin"/i);
      // Verify it's in the enabled manifest
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
      await createMalformedPlugin(pluginDir, pluginName); // Create a malformed plugin (missing index.js)
      await harness.runCli(['collection', 'add', collDir, '--name', collectionName]);
    },
    args: (sandboxDir) => [
      'plugin',
      'enable',
      'invalid-coll/invalid-plugin',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1); // Expect non-zero exit code
      // Assert specific output to stdout and stderr
      expect(stdout).to.match(/Running validation for plugin 'invalid-plugin' before enabling/i); // This message should be on stdout
      expect(stdout).to.match(/Plugin 'invalid-plugin' is INVALID/i); 
      expect(stderr).to.match(/Errors:\s+- Missing required file: 'index.js'/i); // Specific validation error in stderr
      expect(stderr).to.match(/Plugin validation failed for 'invalid-plugin'/i); // Error message about overall failure

      // Verify it's NOT in the enabled manifest
      const enabledManifestPath = path.join(sandboxDir, '.cm-test-root', 'enabled.yaml');
      const enabledManifestExists = await fs.pathExists(enabledManifestPath);
      if (enabledManifestExists) {
          const enabledManifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
          expect(enabledManifest.enabled_plugins).to.be.an('array').that.is.empty;
      }
    },
  },
];
