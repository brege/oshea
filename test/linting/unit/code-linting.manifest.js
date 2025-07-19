// test/linting/unit/code-linting.manifest.js
const fs = require('fs-extra');
const path = require('path');
const {
  loggingLintPath,
  removeAutoDocPath,
  stripTrailingWhitespacePath,
  standardizeJsLineOneAllPath,
  noRelativePathsPath
} = require('@paths');

module.exports = [
  {
    describe: 'logging-lint should fail on console.log usage',
    scriptPath: loggingLintPath,
    sandboxPrefix: 'logging-lint-',
    setup: async (sandboxDir) => {
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), 'console.log("bad");');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(1);
      expect(stdout).to.match(/Disallowed 'console.log' call found/i);
    },
  },
  {
    describe: 'remove-auto-doc should report auto-doc comment blocks',
    scriptPath: removeAutoDocPath,
    sandboxPrefix: 'auto-doc-',
    setup: async (sandboxDir) => {
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), '/**\n * @auto-doc\n */');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Found auto-doc block comment/i);
    },
  },
  {
    describe: 'strip-trailing-whitespace should report trailing whitespace',
    scriptPath: stripTrailingWhitespacePath,
    sandboxPrefix: 'whitespace-',
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
    describe: 'standardize-js-line-one-all should report incorrect header',
    scriptPath: standardizeJsLineOneAllPath,
    sandboxPrefix: 'header-',
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
    describe: 'no-relative-paths should report relative require()',
    scriptPath: noRelativePathsPath,
    sandboxPrefix: 'relative-path-',
    setup: async (sandboxDir) => {
      // lint-disable-next-line
      await fs.writeFile(path.join(sandboxDir, 'bad-file.js'), 'const x = require("../bad");');
    },
    args: (sandboxDir) => [path.join(sandboxDir, 'bad-file.js')],
    assert: async ({ exitCode, stdout }) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Disallowed relative path in require/i);
    },
  },
];
