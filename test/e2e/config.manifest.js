// test/e2e/config.manifest.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { TEST_CONFIG_PATH } = require('../shared/test-constants');

module.exports = [
  {
    describe: '3.3.1: (Happy Path) Correctly displays the global configuration',
    useFactoryDefaults: false, // Opt-out of the default --factory-defaults flag
    setup: async (sandboxDir) => {
      // No sandbox setup needed as we are referencing an existing config file.
    },
    args: (sandboxDir) => [
      'config',
      '--config',
      TEST_CONFIG_PATH,
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // Check for a few key values to confirm the correct config was loaded and displayed.
      expect(stdout).to.match(/pdf_viewer: null/i);
      expect(stdout).to.match(/plugins:/i);
      expect(stdout).to.match(/cv:\s*.*\/cv\.config\.yaml/i);
    },
  },
  {
    describe: '3.3.2: (Key Option) Correctly displays the merged configuration for a specific plugin using --plugin',
    useFactoryDefaults: false, // Opt-out
    setup: async (sandboxDir) => {
      // No sandbox setup needed.
    },
    args: (sandboxDir) => [
      'config',
      '--plugin',
      'default',
      '--config',
      TEST_CONFIG_PATH,
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // Check that the merged/overridden values are displayed
      expect(stdout).to.match(/description: Test Override for Default Plugin/i);
      expect(stdout).to.match(/format: A5/i);
      expect(stdout).to.match(/top: 0.5in/i);
      // Check that it shows the source info
      expect(stdout).to.match(/Contributing Configuration Files/i);
    },
  },
  {
    describe: '3.3.3: (Key Option) Correctly outputs clean YAML when using the --pure flag',
    useFactoryDefaults: false, // Opt-out
    setup: async (sandboxDir) => {
      // No sandbox setup needed.
    },
    args: (sandboxDir) => [
      'config',
      '--pure',
      '--config',
      TEST_CONFIG_PATH,
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // The output should be pure YAML, so it should not have our comment headers.
      expect(stdout).to.not.match(/# Configuration Sources:/i);
      expect(stdout).to.not.match(/# Note:/i);

      // It should be valid YAML.
      let parsedYaml;
      try {
        parsedYaml = yaml.load(stdout);
      } catch (e) {
        throw new Error(`The --pure output was not valid YAML: ${e.message}`);
      }
      // Check a key value from the parsed object.
      expect(parsedYaml.pdf_viewer).to.be.null;
      expect(parsedYaml.params.author_param).to.equal('Author From Base Config');
    },
  },
];
