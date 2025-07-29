// test/runners/e2e/plugin-add.manifest.js
const path = require('path');
const stripAnsi = require('strip-ansi');

require('module-alias/register');
const { createDummyPluginPath } = require('@paths');
const { createDummyPlugin } = require(createDummyPluginPath);

module.exports = [
  {
    describe: '3.6.1: (Happy Path) Successfully adds and enables a singleton plugin from a local path',
    setup: async (sandboxDir) => {
      await createDummyPlugin('my-local-plugin-src', {
        destinationDir: sandboxDir,
        baseFixture: 'valid-plugin'
      });
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
      expect(strippedStdout).to.match(/Attempting to add and enable plugin from local path/i);
    },
  },
];
