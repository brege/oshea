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
];
