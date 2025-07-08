// test/integration/plugins/plugin-registry-builder.cm-manifests.manifest.js
const path = require('path');
const sinon = require('sinon'); // Needed for some stubbing in setup

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
};

module.exports = [
  {
    description: '1.2.20: Should skip invalid entries in the manifest',
    methodName: '_getPluginRegistrationsFromCmManifest',
    methodArgs: [
      '/fake/cm/enabled.yaml', // cmEnabledManifestPath
      'Test' // sourceType
    ],
    setup: async ({ mockDependencies }, constants) => {
      const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
      const fakeParsedData = {
        enabled_plugins: [
          { invoke_name: 'good-plugin', config_path: '/fake/path' }, // Valid
          { invoke_name: 'bad-plugin-no-path' }, // Invalid: missing config_path
          null, // Invalid: null entry
          { config_path: '/another/fake/path' } // Invalid: missing invoke_name
        ]
      };
      mockDependencies.fs.existsSync.withArgs(FAKE_MANIFEST_PATH).returns(true);
      mockDependencies.fs.existsSync.withArgs('/fake/path').returns(true); // good-plugin path exists
      mockDependencies.fs.existsSync.withArgs('/another/fake/path').returns(true); // another-plugin path exists
      mockDependencies.fsPromises.readFile.withArgs(FAKE_MANIFEST_PATH).resolves('');
      mockDependencies.yaml.load.withArgs('').returns(fakeParsedData);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(Object.keys(result)).to.have.lengthOf(1);
      expect(result).to.have.property('good-plugin');
      expect(logs).to.have.lengthOf(3); // Expect 3 warnings for invalid entries
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Invalid entry in CM manifest: .*bad-plugin-no-path.*\. Skipping\./);
      expect(logs[1].level).to.equal('warn');
      expect(logs[1].msg).to.match(/Invalid entry in CM manifest: null\. Skipping\./);
      expect(logs[2].level).to.equal('warn');
      expect(logs[2].msg).to.match(/Invalid entry in CM manifest: .*another\/fake\/path.*\. Skipping\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.21: Should skip plugins whose config_path doesn\'t exist and log a warning',
    methodName: '_getPluginRegistrationsFromCmManifest',
    methodArgs: [
      '/fake/cm/enabled.yaml',
      'Test'
    ],
    setup: async ({ mockDependencies }, constants) => {
      const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
      const MISSING_CONFIG_PATH = '/path/to/missing/config.yaml';
      const fakeParsedData = {
        enabled_plugins: [{
          invoke_name: 'plugin-with-missing-config',
          config_path: MISSING_CONFIG_PATH
        }]
      };
      mockDependencies.fs.existsSync.withArgs(FAKE_MANIFEST_PATH).returns(true);
      mockDependencies.fs.existsSync.withArgs(MISSING_CONFIG_PATH).returns(false); // Simulate missing config path
      mockDependencies.fsPromises.readFile.withArgs(FAKE_MANIFEST_PATH).resolves('');
      mockDependencies.yaml.load.withArgs('').returns(fakeParsedData);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('object').that.is.empty;
      expect(logs).to.have.lengthOf(1); // Expect 1 warning
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Config path '\/path\/to\/missing\/config\.yaml' for CM-enabled plugin 'plugin-with-missing-config' does not exist\. Skipping\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
];

