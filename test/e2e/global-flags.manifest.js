// test/e2e/global-flags.manifest.js
const path = require('path');
const { version } = require('../../package.json'); // Import version for the test

module.exports = [
  {
    describe: "3.15.1: The --version flag correctly displays the tool's version",
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => ['--version'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout.trim()).to.equal(version);
    },
  },
  {
    describe: "3.15.2: The --help flag correctly displays the help text",
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => ['--help'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Usage: md-to-pdf/i);
      expect(stdout).to.match(/Commands:/i);
      expect(stdout).to.match(/Options:/i);
    },
  },
  {
    describe: '3.15.3: (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message',
    setup: async (sandboxDir) => {},
    args: (sandboxDir) => ['this-is-not-a-command'],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      // Corrected assertion to match the new error logic in cli.js
      expect(stderr).to.match(/Error: Unknown command/i);
    },
  },
];
