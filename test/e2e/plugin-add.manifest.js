// test/e2e/plugin-add.manifest.js
const fs = require('fs-extra');
const path = require('path');
const stripAnsi = require('strip-ansi');

async function createDummyPlugin(pluginDir, pluginName) {
  await fs.ensureDir(pluginDir);
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
  await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
}

module.exports = [
  {
    describe: '3.6.1: (Happy Path) Successfully adds and enables a singleton plugin from a local path',
    setup: async (sandboxDir) => {
      const sourcePluginDir = path.join(sandboxDir, 'my-local-plugin-src');
      await createDummyPlugin(sourcePluginDir, 'my-local-plugin-src');
    },
    args: (sandboxDir) => [
      'plugin',
      'add',
      path.join(sandboxDir, 'my-local-plugin-src'),
      '--bypass-validation',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      const strippedStdout = stripAnsi(stdout);
      expect(strippedStdout).to.match(/Successfully processed 'plugin add'/i);
      expect(strippedStdout).to.match(/enabled as "my-local-plugin-src"/i);
    },
  },
];
