// test/e2e/plugin-create.manifest.js
const fs = require('fs-extra');
const path = require('path');

// Helper to check for the existence of a list of files in a directory
async function checkFilesExist(baseDir, files, expect) {
    for (const file of files) {
        const filePath = path.join(baseDir, file);
        const exists = await fs.pathExists(filePath);
        expect(exists, `Expected file to exist: ${filePath}`).to.be.true;
    }
}

module.exports = [
  {
    describe: '3.5.1: (Happy Path) Successfully creates a new plugin directory with boilerplate files',
    setup: async (sandboxDir) => {
        // No setup needed, as we are creating from the bundled template.
    },
    args: (sandboxDir) => [
      'plugin',
      'create',
      'my-boilerplate-plugin',
      '--target-dir',
      sandboxDir
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      const pluginDir = path.join(sandboxDir, 'my-boilerplate-plugin');
      await checkFilesExist(pluginDir, [
        'index.js',
        'my-boilerplate-plugin.config.yaml',
        'my-boilerplate-plugin.css',
        'my-boilerplate-plugin-example.md',
        'README.md'
      ], expect);
    },
  },
  {
    describe: '3.5.2: (Key Option) Successfully archetypes a new plugin from a source with --from',
    setup: async (sandboxDir) => {
        // Create a simple source plugin to archetype from
        const sourcePluginDir = path.join(sandboxDir, 'source-plugin');
        await fs.ensureDir(sourcePluginDir);
        await fs.writeFile(path.join(sourcePluginDir, 'index.js'), 'module.exports = {};');
        await fs.writeFile(path.join(sourcePluginDir, 'source-plugin.config.yaml'), 'description: Source Plugin');
    },
    args: (sandboxDir) => [
      'plugin',
      'create',
      'my-archetyped-plugin',
      '--from',
      path.join(sandboxDir, 'source-plugin'),
      '--target-dir',
      sandboxDir
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
        expect(exitCode).to.equal(0);
        const pluginDir = path.join(sandboxDir, 'my-archetyped-plugin');
        // Check that files were copied and renamed correctly
        await checkFilesExist(pluginDir, [
            'index.js',
            'my-archetyped-plugin.config.yaml', // Was renamed
        ], expect);
    },
  },
  {
    describe: '3.5.3: (Happy Path) A plugin created from the default template passes validation',
    setup: async (sandboxDir, harness) => {
      // The plugin will be created in a subdirectory within the sandbox
      const newPluginDir = path.join(sandboxDir, 'temp-valid-plugin');
      // Create the plugin using the CLI command
      const createResult = await harness.runCli([
        'plugin',
        'create',
        'temp-valid-plugin',
        '--target-dir',
        sandboxDir
      ]);
      expect(createResult.exitCode).to.equal(0);
      // Ensure the plugin directory actually exists after creation
      const pluginExists = await fs.pathExists(newPluginDir);
      expect(pluginExists).to.be.true;
    },
    args: (sandboxDir) => [
      'plugin',
      'validate',
      path.join(sandboxDir, 'temp-valid-plugin')
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Plugin 'temp-valid-plugin' is VALID/i);
      expect(stderr).to.not.match(/error/i); // No errors should be reported
    },
  },
  {
    describe: '3.5.4: (Happy Path) A plugin archetyped from a valid bundled plugin passes validation',
    setup: async (sandboxDir, harness) => {
      const newPluginName = 'archetype-from-bundled-plugin';
      const newPluginDir = path.join(sandboxDir, newPluginName);
      // Create the plugin by archetyping from a bundled plugin (e.g., 'cv')
      const createResult = await harness.runCli([
        'plugin',
        'create',
        newPluginName,
        '--from',
        'cv',
        '--target-dir',
        sandboxDir
      ]);
      expect(createResult.exitCode).to.equal(0);
      const pluginExists = await fs.pathExists(newPluginDir);
      expect(pluginExists).to.be.true;
    },
    args: (sandboxDir) => [
      'plugin',
      'validate',
      path.join(sandboxDir, 'archetype-from-bundled-plugin')
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Plugin 'archetype-from-bundled-plugin' is VALID/i);
      expect(stderr).to.not.match(/error/i); // No errors should be reported
    },
  },
];
