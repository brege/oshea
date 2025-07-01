// test/e2e/plugin-list.manifest.js
const fs = require('fs-extra');
const path = require('path');

// Helper to create a dummy plugin structure for testing CM commands
async function createDummyPlugin(pluginDir, pluginName) {
    await fs.ensureDir(pluginDir);
    await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}

// Helper for setting up a collection with one plugin enabled
async function setupCollectionWithOneEnabled(sandboxDir, harness) {
    const collDir = path.join(sandboxDir, 'test-collection');
    await createDummyPlugin(path.join(collDir, 'plugin-one'), 'plugin-one');
    await createDummyPlugin(path.join(collDir, 'plugin-two'), 'plugin-two');

    // Use the harness to run the prerequisite setup commands
    await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection'], { useFactoryDefaults: false });
    await harness.runCli(['plugin', 'enable', 'test-collection/plugin-one', '--name', 'enabled-one'], { useFactoryDefaults: false });
}


module.exports = [
  {
    describe: '3.4.1: Correctly lists plugins with the default filter (from factory defaults)',
    // No useFactoryDefaults:false, so this test uses the default sandboxed harness
    setup: async (sandboxDir) => {
      // No sandbox setup needed.
    },
    args: (sandboxDir) => [
      'plugin',
      'list',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // Check for plugins that are actually in config.example.yaml
      expect(stdout).to.match(/Name: cv/i);
      expect(stdout).to.match(/Name: recipe/i);
      // This plugin is NOT in the default config, so this ensures we aren't picking up other configs.
      expect(stdout).to.not.match(/Name: business-card/i);
    },
  },
  {
    describe: '3.4.2: Correctly filters for enabled plugins with --enabled',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--enabled'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // It should list the enabled plugin
      expect(stdout).to.match(/Name: enabled-one/i);
      expect(stdout).to.match(/Status: Enabled \(CM\)/i);
      // It should NOT list the available-but-disabled plugin
      expect(stdout).to.not.match(/plugin-two/i);
    },
  },
  {
    describe: '3.4.3: Correctly filters for disabled plugins with --disabled',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--disabled'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // It should NOT list the enabled plugin
      expect(stdout).to.not.match(/enabled-one/i);
      // It should list the available-but-disabled plugin
      expect(stdout).to.match(/Name: test-collection\/plugin-two/i);
      expect(stdout).to.match(/Status: Available \(CM\)/i);
    },
  },
  {
    describe: '3.4.4: Correctly filters for all available plugins with --available',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--available'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // It should list the enabled plugin
      expect(stdout).to.match(/Name: enabled-one/i);
      // It should also list the available-but-disabled plugin
      expect(stdout).to.match(/Name: test-collection\/plugin-two/i);
    },
  },
];
