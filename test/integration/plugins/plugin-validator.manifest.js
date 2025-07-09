// test/integration/plugins/plugin-validator.manifest.js
const { makeValidatorScenario, setupWellFormedPlugin } = require('./plugin-validator.factory');
const path = require('path');

module.exports = [
  makeValidatorScenario({
    description: '2.4.1: Should report a fully compliant plugin as VALID',
    pluginName: 'valid-plugin',
    setup: setupWellFormedPlugin,
    expectedResult: { isValid: true, errors: [], warnings: [] },
  }),
  makeValidatorScenario({
    description: '2.4.6: Should FAIL a validation check if a required file is missing',
    pluginName: 'missing-file-plugin',
    setup: (pluginDir, pluginName, { mockFs, mockYaml }) => {
      mockFs.existsSync.withArgs(path.join(pluginDir, 'index.js')).returns(false);
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`)).returns(true);
      mockFs.readFileSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`), 'utf8').returns(`plugin_name: ${pluginName}\nprotocol: v1`);
      mockYaml.load.returns({ plugin_name: pluginName, protocol: 'v1' });
    },
    expectedResult: { isValid: false, errors: ['Missing required file: \'index.js\'.', 'Missing required file: \'missing-file-plugin-example.md\'.', 'Missing required file: \'README.md\'.'] },
  }),
  makeValidatorScenario({
    description: '2.4.5: Should default to v1 and WARN if protocol is missing',
    pluginName: 'missing-protocol-plugin',
    setup: (pluginDir, pluginName, { mockFs, mockYaml, mockExecSync }) => {
      mockFs.existsSync.withArgs(path.join(pluginDir, 'index.js')).returns(true);
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`)).returns(true);
      mockFs.readFileSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`), 'utf8').returns(`plugin_name: ${pluginName}\nversion: 1.0.0`);
      mockFs.existsSync.withArgs(path.join(pluginDir, 'README.md')).returns(true);
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}-example.md`)).returns(true);
      mockYaml.load.returns({ plugin_name: pluginName, version: '1.0.0'});
      mockExecSync.returns('');
    },
    expectedResult: { isValid: true, warnings: ['Plugin protocol not found in config. Defaulting to \'v1\'.'] },
  }),
  makeValidatorScenario({
    description: '2.4.8: Should FAIL if the in-situ E2E test fails',
    pluginName: 'failing-test-plugin',
    setup: (pluginDir, pluginName, mocks) => {
      setupWellFormedPlugin(pluginDir, pluginName, mocks);
      mocks.mockExecSync.throws(new Error('Test failed with exit code 1'));
    },
    expectedResult: { isValid: false, errors: ['In-situ E2E test failed'] },
  }),
  makeValidatorScenario({
    description: '2.4.2: Should FAIL validation for a plugin with an unsupported protocol',
    pluginName: 'unsupported-proto',
    setup: (pluginDir, pluginName, { mockFs, mockYaml }) => {
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`)).returns(true);
      mockFs.readFileSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`), 'utf8').returns(`plugin_name: ${pluginName}\nprotocol: v99`);
      mockYaml.load.returns({plugin_name: pluginName, protocol: 'v99'});
    },
    expectedResult: { isValid: false, errors: ['Unsupported plugin protocol \'v99\' for plugin \'unsupported-proto\'.'] },
  }),
  makeValidatorScenario({
    description: '2.4.3: Should FAIL validation if directory name mismatches metadata plugin_name',
    pluginName: 'dir-name',
    setup: (pluginDir, pluginName, { mockFs, mockYaml }) => {
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`)).returns(true);
      mockFs.readFileSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`), 'utf8').returns('plugin_name: mismatched-name\nprotocol: v1');
      mockYaml.load.returns({plugin_name: 'mismatched-name', protocol: 'v1'});
    },
    expectedResult: { isValid: false, errors: ['Resolved \'plugin_name\' (\'mismatched-name\') does not match plugin directory name (\'dir-name\'). This is a critical mismatch.'] },
  }),
  makeValidatorScenario({
    description: '2.4.7: Should report USABLE (with warnings) for missing optional files',
    pluginName: 'missing-optional',
    setup: (pluginDir, pluginName, { mockFs, mockYaml, mockExecSync }) => {
      mockFs.existsSync.withArgs(path.join(pluginDir, 'index.js')).returns(true);
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`)).returns(true);
      mockFs.readFileSync.withArgs(path.join(pluginDir, `${pluginName}.config.yaml`), 'utf8').returns(`plugin_name: ${pluginName}\nprotocol: v1`);
      mockFs.existsSync.withArgs(path.join(pluginDir, 'README.md')).returns(true);
      mockFs.existsSync.withArgs(path.join(pluginDir, `${pluginName}-example.md`)).returns(true);
      mockYaml.load.returns({plugin_name: pluginName, protocol: 'v1'});
      mockExecSync.returns('');
    },
    expectedResult: { isValid: true, warnings: ['Missing optional \'.contract/test/\' directory.', 'Missing optional schema file (\'missing-optional.schema.json\') in .contract/ directory.', 'Missing E2E test file, skipping test run: \'.contract/test/missing-optional-e2e.test.js\'.'] },
  }),

  makeValidatorScenario({
    description: '2.4.10: Should report USABLE (with warnings) for malformed README.md front matter',
    pluginName: 'bad-readme',
    setup: (pluginDir, pluginName, mocks) => {
      setupWellFormedPlugin(pluginDir, pluginName, mocks);
      const readmePath = path.join(pluginDir, 'README.md');
      mocks.mockFs.readFileSync.withArgs(readmePath, 'utf8').returns('---:\n-');
      mocks.mockYaml.load.withArgs(sinon.match.any).callThrough(); // allow normal load for config
      mocks.mockYaml.load.withArgs(':\n-').throws(new Error('bad yaml')); // fail for readme
    },
    expectedResult: {
      isValid: true,
      warnings: [
        'README.md for \'bad-readme\' does not have a valid YAML front matter block.'
      ]
    }
  }),

  makeValidatorScenario({
    description: '2.4.9: Should report as INVALID when plugin self-activation fails',
    pluginName: 'bad-activation',
    setup: (pluginDir, pluginName, mocks) => {
      setupWellFormedPlugin(pluginDir, pluginName, mocks);
      mocks.mockExecSync.withArgs(sinon.match(/convert/)).throws(new Error('Activation failed'));
    },
    expectedResult: { isValid: false, errors: ['Self-activation failed: The plugin was unable to convert its own example file.'] }
  }),
];
