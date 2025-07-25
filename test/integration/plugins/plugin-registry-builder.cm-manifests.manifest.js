// test/integration/plugins/plugin-registry-builder.cm-manifests.manifest.js
require('module-alias/register');
const { pluginRegistryBuilderFactoryPath } = require('@paths');
const { makeCmManifestScenario } = require(pluginRegistryBuilderFactoryPath);

module.exports = [
  {
    description: '1.2.20: Should skip invalid entries in the manifest',
    methodName: '_getPluginRegistrationsFromCmManifest',
    methodArgs: ['/fake/cm/enabled.yaml', 'Test'],
    ...makeCmManifestScenario({
      enabledPlugins: [
        { invoke_name: 'good-plugin', config_path: '/fake/path' },
        { invoke_name: 'bad-plugin-no-path' },
        null,
        { config_path: '/another/fake/path' }
      ],
      configPathsExist: { '/fake/path': true, '/another/fake/path': true },
      expectResult: {
        'good-plugin': {
          configPath: '/fake/path',
          sourceType: 'Test',
          definedIn: '/fake/cm/enabled.yaml'
        }
      },
      expectLogs: [
        /Invalid entry in CM manifest/, // Updated to match simplified structured log message
        /Invalid entry in CM manifest/, // Updated to match simplified structured log message
        /Invalid entry in CM manifest/, // Updated to match simplified structured log message
      ]
    })
  },
  {
    description: '1.2.21: Should skip plugins whose config_path doesn\'t exist and log a warning',
    methodName: '_getPluginRegistrationsFromCmManifest',
    methodArgs: ['/fake/cm/enabled.yaml', 'Test'],
    ...makeCmManifestScenario({
      enabledPlugins: [{ invoke_name: 'plugin-with-missing-config', config_path: '/path/to/missing/config.yaml' }],
      configPathsExist: { '/path/to/missing/config.yaml': false },
      expectResult: {},
      expectLogs: [
        /Config path for CM-enabled plugin does not exist/ // Updated to match simplified structured log message
      ]
    })
  },
];
