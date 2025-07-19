// test/integration/plugins/plugin-registry-builder.cm-manifests.manifest.js
const { makeCmManifestScenario } = require('./plugin-registry-builder.factory');

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
        /Invalid entry in CM manifest: .*bad-plugin-no-path.*\. Skipping\./,
        /Invalid entry in CM manifest: null\. Skipping\./,
        /Invalid entry in CM manifest: .*another\/fake\/path.*\. Skipping\./,
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
        /Config path '\/path\/to\/missing\/config\.yaml' for CM-enabled plugin 'plugin-with-missing-config' does not exist\. Skipping\./
      ]
    })
  },
];
