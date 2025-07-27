// test/runners/e2e/plugin-list.manifest.js
const fs = require('fs-extra');
const path = require('path');

async function createDummyPlugin(pluginDir, pluginName) {
  await fs.ensureDir(pluginDir);
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}

async function setupCollectionWithOneEnabled(sandboxDir, harness) {
  const collDir = path.join(sandboxDir, 'test-collection');
  await createDummyPlugin(path.join(collDir, 'plugin-one'), 'plugin-one');
  await createDummyPlugin(path.join(collDir, 'plugin-two'), 'plugin-two');

  await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection'], { useFactoryDefaults: false });
  await harness.runCli(['plugin', 'enable', 'test-collection/plugin-one', '--name', 'enabled-one'], { useFactoryDefaults: false });
}


module.exports = [
  {
    describe: '3.4.1: Correctly lists plugins with the default filter (from factory defaults)',
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => [
      'plugin',
      'list',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Name: cv/i);
      expect(stdout).to.match(/Name: recipe/i);
      expect(stdout).to.not.match(/Name: business-card/i);
    },
  },
  {
    describe: '3.4.2: Correctly filters for enabled plugins with --enabled',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--enabled'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Name: enabled-one/i);
      expect(stdout).to.match(/Status: Enabled \(CM\)/i);
      expect(stdout).to.not.match(/plugin-two/i);
    },
  },
  {
    describe: '3.4.3: Correctly filters for disabled plugins with --disabled',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--disabled'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.not.match(/enabled-one/i);
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
      expect(stdout).to.match(/Name: enabled-one/i);
      expect(stdout).to.match(/Name: test-collection\/plugin-two/i);
    },
  },
];
