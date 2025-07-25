// test/linting/unit/code-linting.manifest.js
// lint-skip-file no-console
const fs = require('fs-extra');
const path = require('path');
const {
  noConsolePath,
  noJsdocPath,
  noTrailingWhitespacePath,
  noBadHeadersPath,
  noRelativePathsPath,
} = require('@paths');

module.exports = [
  {
    describe: 'M.0.1.1 no-console should fail on console.log usage',
    scriptPath: noConsolePath,
    sandboxPrefix: 'no-console-',
    setup: async (sandboxDir) => {
      // lint-skip-line no-console
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), 'console.log("bad");');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(1);
      expect(stdout).to.match(/Disallowed 'console.log' call found/i);
    },
  },
  {
    describe: 'M.0.1.2 no-jsdoc should report jsdoc comment blocks',
    scriptPath: noJsdocPath,
    sandboxPrefix: 'no-jsdoc-',
    setup: async (sandboxDir) => {
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), '/**\n * @jsdoc\n */');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Found jsdoc block comment/i);
    },
  },
  {
    describe: 'M.0.1.3 no-trailing-whitespace should report trailing whitespace',
    scriptPath: noTrailingWhitespacePath,
    sandboxPrefix: 'no-trailing-whitespace-',
    setup: async (sandboxDir) => {
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), 'const x = 1;  ');
    },
    args: (sandboxDir) => ['bad-file.js'],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Trailing whitespace found/i);
    },
  },
  {
    describe: 'M.0.1.4 no-bad-headers should report incorrect header',
    scriptPath: noBadHeadersPath,
    sandboxPrefix: 'no-bad-headers-',
    setup: async (sandboxDir) => {
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), '// incorrect/path/to/file.js');
    },
    args: (sandboxDir) => ['bad-file.js'],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Incorrect header path/i);
    },
  },
  {
    describe: 'M.0.1.5 no-relative-paths should report relative require()',
    scriptPath: noRelativePathsPath,
    sandboxPrefix: 'no-relative-path-',
    setup: async (sandboxDir) => {
      // lint-skip-next-line no-relative-paths
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), 'const x = require("../bad");');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Disallowed relative path in require/i);
    },
  },
];

