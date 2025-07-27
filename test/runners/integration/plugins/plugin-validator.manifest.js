// test/runners/integration/plugins/plugin-validator.manifest.js
require('module-alias/register');
const { pluginValidatorFactoryPath } = require('@paths');
const {
  makeValidatorScenario,
  setupPluginScenario,
  setupWellFormedPlugin
} = require(pluginValidatorFactoryPath);
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
    setup: setupPluginScenario({
      files: {
        'index.js': false,
        'missing-file-plugin.config.yaml': true,
        'missing-file-plugin-example.md': false,
        'README.md': false,
      },
      yaml: {
        'missing-file-plugin.config.yaml': { plugin_name: 'missing-file-plugin', protocol: 'v1' },
      }
    }),
    expectedResult: {
      isValid: false,
      errors: [
        'Missing required file: \'index.js\'.',
        'Missing required file: \'missing-file-plugin-example.md\'.',
        'Missing required file: \'README.md\'.'
      ]
    }
  }),

  makeValidatorScenario({
    description: '2.4.5: Should default to v1 and WARN if protocol is missing',
    pluginName: 'missing-protocol-plugin',
    setup: setupPluginScenario({
      files: {
        'index.js': true,
        'missing-protocol-plugin.config.yaml': true,
        'README.md': true,
        'missing-protocol-plugin-example.md': true,
      },
      yaml: {
        'missing-protocol-plugin.config.yaml': { plugin_name: 'missing-protocol-plugin', version: '1.0.0' },
      },
      exec: { returns: '' }
    }),
    expectedResult: {
      isValid: true,
      warnings: ['protocol not found']
    }
  }),

  makeValidatorScenario({
    description: '2.4.8: Should FAIL if the in-situ E2E test fails',
    pluginName: 'failing-test-plugin',
    setup: setupPluginScenario({
      files: {
        'index.js': true,
        'failing-test-plugin.config.yaml': true,
        'README.md': true,
        'failing-test-plugin-example.md': true,
        '.contract/test/failing-test-plugin-e2e.test.js': true,
        '.contract/failing-test-plugin.schema.json': true,
      },
      yaml: {
        'failing-test-plugin.config.yaml': { plugin_name: 'failing-test-plugin', protocol: 'v1', version: '1.0.0' },
      },
      exec: { throws: 'Test failed with exit code 1' }
    }),
    expectedResult: { isValid: false, errors: ['In-situ E2E test failed'] }
  }),

  makeValidatorScenario({
    description: '2.4.2: Should FAIL validation for a plugin with an unsupported protocol',
    pluginName: 'unsupported-proto',
    setup: (pluginDir, pluginName, mocks) => {
      const configPath = path.join(pluginDir, `${pluginName}.config.yaml`);
      const configYaml = `plugin_name: ${pluginName}\nprotocol: v99`;
      // Files exist
      ['index.js', `${pluginName}.config.yaml`, 'README.md', `${pluginName}-example.md`].forEach(file => {
        mocks.mockFs.existsSync.withArgs(path.join(pluginDir, file)).returns(true);
      });
      mocks.mockFs.readFileSync.withArgs(configPath, 'utf8').returns(configYaml);
      mocks.mockYaml.load.withArgs(configYaml).returns({ plugin_name: pluginName, protocol: 'v99' });
    },
    expectedResult: {
      isValid: false,
      errors: [ 'Unsupported plugin protocol \'v99\'' ]
    }
  }),
  makeValidatorScenario({
    description: '2.4.3: Should FAIL validation if directory name mismatches metadata plugin_name',
    pluginName: 'dir-name',
    setup: (pluginDir, pluginName, mocks) => {
      const configPath = path.join(pluginDir, `${pluginName}.config.yaml`);
      const configYaml = 'plugin_name: mismatched-name\nprotocol: v1';
      ['index.js', `${pluginName}.config.yaml`, 'README.md', `${pluginName}-example.md`].forEach(file => {
        mocks.mockFs.existsSync.withArgs(path.join(pluginDir, file)).returns(true);
      });
      mocks.mockFs.readFileSync.withArgs(configPath, 'utf8').returns(configYaml);
      mocks.mockYaml.load.withArgs(configYaml).returns({ plugin_name: 'mismatched-name', protocol: 'v1' });
    },
    expectedResult: {
      isValid: false,
      errors: [ 'does not match plugin directory name' ]
    }
  }),



  makeValidatorScenario({
    description: '2.4.7: Should report USABLE (with warnings) for missing optional files',
    pluginName: 'missing-optional',
    setup: setupPluginScenario({
      files: {
        'index.js': true,
        'missing-optional.config.yaml': true,
        'README.md': true,
        'missing-optional-example.md': true,
      },
      yaml: {
        'missing-optional.config.yaml': { plugin_name: 'missing-optional', protocol: 'v1' }
      },
      exec: { returns: '' }
    }),
    expectedResult: {
      isValid: true,
      warnings: [
        'Missing optional \'.contract/test/\' directory.',
        'Missing optional schema file',
        'Missing E2E test file'
      ]
    }
  }),

  makeValidatorScenario({
    description: '2.4.10: Should report USABLE (with warnings) for malformed README.md front matter',
    pluginName: 'bad-readme',
    setup: (pluginDir, pluginName, mocks) => {
      // Use the well-formed helper, then override README.md YAML parsing to throw
      setupWellFormedPlugin(pluginDir, pluginName, mocks);
      const readmePath = path.join(pluginDir, 'README.md');
      mocks.mockFs.readFileSync.withArgs(readmePath, 'utf8').returns('---:\n-');
      mocks.mockYaml.load.withArgs(sinon.match.any).callThrough();
      mocks.mockYaml.load.withArgs(':\n-').throws(new Error('bad yaml'));
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
    expectedResult: {
      isValid: false,
      errors: [ 'Self-activation failed' ]
    }
  }),
];

