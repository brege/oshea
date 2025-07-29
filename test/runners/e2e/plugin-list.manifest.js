// test/runners/e2e/plugin-list.manifest.js
const path = require('path');

require('module-alias/register');
const { createDummyPluginPath } = require('@paths');
const { createDummyPlugin } = require(createDummyPluginPath);

async function setupCollectionWithOneEnabled(sandboxDir, harness) {
  const collDir = path.join(sandboxDir, 'test-collection');

  await createDummyPlugin('plugin-one', {
    destinationDir: collDir,
    baseFixture: 'valid-plugin'
  });
  await createDummyPlugin('plugin-two', {
    destinationDir: collDir,
    baseFixture: 'valid-plugin'
  });

  // Add collection
  const addResult = await harness.runCli(['collection', 'add', collDir, '--name', 'test-collection'], { useFactoryDefaults: false });
  if (addResult.exitCode !== 0) {
    throw new Error(`Collection add command failed:\n${addResult.stderr}`);
  }

  // Enable plugin with correct path ('plugin-one')
  const enableResult = await harness.runCli(['plugin', 'enable', 'test-collection/plugin-one', '--name', 'enabled-one', '--bypass-validation'], { useFactoryDefaults: false });
  if (enableResult.exitCode !== 0) {
    throw new Error(`Plugin enable command failed:\n${enableResult.stderr}`);
  }

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
      // Try matching either alias or real plugin name:
      expect(stdout).to.match(/Name:\s*enabled-one/i);
      expect(stdout).to.match(/Status:\s*Enabled \(CM\)/i);
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
      expect(stdout).to.match(/Name:\s*test-collection\/plugin-two/i);
      expect(stdout).to.match(/Status:\s*Available \(CM\)/i);
    },
  },
  {
    describe: '3.4.4: Correctly filters for all available plugins with --available',
    setup: setupCollectionWithOneEnabled,
    args: (sandboxDir) => ['plugin', 'list', '--available'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Name:\s*enabled-one/i);
      expect(stdout).to.match(/Name:\s*test-collection\/plugin-two/i);
    },
  },
];


