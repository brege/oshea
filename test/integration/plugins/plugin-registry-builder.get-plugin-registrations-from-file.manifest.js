// test/integration/plugins/plugin-registry-builder.get-plugin-registrations-from-file.manifest.js
require('module-alias/register');
const { pluginRegistryBuilderFactoryPath } = require('@paths');
const { makeFileRegistrationScenario } = require(pluginRegistryBuilderFactoryPath);

const FAKE_CONFIG_PATH = '/fake/config.yaml';
const FAKE_BASE_DIR = '/fake';

module.exports = [
  {
    description: '1.2.9: Should return an empty object if the main config file does not exist',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: null,
      expectResult: {},
      expectLogs: [
        /Main config file for plugin registrations not found/
      ],
    }),
  },
  {
    description: '1.2.10: Should return an empty object and log an error if the config file is malformed',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlError: new Error('YAML parse error'),
      expectResult: {},
      expectLogs: [/Error reading plugin registrations from file/],
    }),
  },
  {
    description: '1.2.11: Should correctly parse a simple config file with plugins',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { plugins: { 'test-plugin': './plugin.config.yaml' } },
      resolvedPaths: { './plugin.config.yaml': '/fake/plugin.config.yaml' },
      fileSystem: { '/fake/plugin.config.yaml': { exists: true, isFile: true } },
      expectResult: { 'test-plugin': { configPath: '/fake/plugin.config.yaml', definedIn: FAKE_CONFIG_PATH, sourceType: 'Test' } },
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Plugin config path resolved to an existing file/,
        /Registered plugin from config file/,
        /Plugin registrations from file complete/
      ],
    }),
  },
  {
    description: '1.2.12: Should handle plugin definitions with aliases',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Aliased Config'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: {
        plugin_directory_aliases: { 'my-alias': '/aliased/dir' },
        plugins: { 'aliased-plugin': 'my-alias:plugin.config.yaml' }
      },
      fileSystem: { '/aliased/dir/plugin.config.yaml': { exists: true, isFile: true } },
      expectResult: {
        'aliased-plugin': {
          configPath: '/aliased/dir/plugin.config.yaml',
          definedIn: FAKE_CONFIG_PATH,
          sourceType: 'Aliased Config'
        }
      },
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Attempting to resolve alias/,
        /Alias resolution successful/,
        /Registered plugin directory alias/,
        /Attempting to resolve plugin config path/,
        /Resolved plugin path using alias/,
        /Plugin config path resolved to an existing file/,
        /Registered plugin from config file/,
        /Plugin registrations from file complete/
      ],
    })
  },
  {
    description: '1.2.13: Should skip registration for plugins with unresolved aliases and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Warn Config'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: {
        plugin_directory_aliases: { 'bad-alias': null },
        plugins: { 'bad-plugin': 'bad-alias:plugin.config.yaml' }
      },
      resolvedPaths: { 'bad-alias:plugin.config.yaml': '/fake/bad-alias:plugin.config.yaml' },
      fileSystem: { '/fake/bad-alias:plugin.config.yaml': { exists: false } },
      expectResult: {},
      expectLogs: [
        /Invalid alias value/,
        /Plugin configuration path does not exist/
      ],
    })
  },
  {
    description: '1.2.14: Should skip registration for plugin paths that do not exist or are not files and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { plugins: { 'nonexistent-plugin': './nonexistent.config.yaml' } },
      resolvedPaths: { './nonexistent.config.yaml': '/fake/nonexistent.config.yaml' },
      fileSystem: { '/fake/nonexistent.config.yaml': { exists: false } },
      expectResult: {},
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Attempting to resolve plugin config path/,
        /Resolved plugin path as relative to main config base path/,
        /Plugin configuration path does not exist/,
        /Plugin registrations from file complete/
      ],
    }),
  },
  {
    description: '1.2.15: Should return an empty object if the config file is empty or contains no plugins/aliases',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: {},
      expectResult: {},
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Plugin registrations from file complete/
      ],
    }),
  },
  {
    description: '1.2.15: Should skip registration for plugin directories without a suitable config file and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { plugins: { 'bad-dir-plugin': './bad-dir' } },
      resolvedPaths: { './bad-dir': '/fake/bad-dir' },
      fileSystem: {
        '/fake/bad-dir': { exists: true, isDir: true, readdir: ['other.txt'] },
        '/fake/bad-dir/bad-dir.config.yaml': { exists: false }
      },
      expectResult: {},
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Attempting to resolve plugin config path/,
        /Resolved plugin path as relative to main config base path/,
        /Plugin configuration path \(directory\) does not contain a suitable config file/,
        /Plugin registrations from file complete/
      ],
    }),
  },
  {
    description: '1.2.16: Should log INFO when using an alternative config file within a plugin directory',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Test'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { plugins: { 'alt-plugin': './alt-dir' } },
      resolvedPaths: { './alt-dir': '/fake/alt-dir' },
      fileSystem: {
        '/fake/alt-dir': { exists: true, isDir: true, readdir: ['alt.config.yaml'] },
        '/fake/alt-dir/alt-dir.config.yaml': { exists: false },
        '/fake/alt-dir/alt.config.yaml': { exists: true, isFile: true }
      },
      expectResult: { 'alt-plugin': { configPath: '/fake/alt-dir/alt.config.yaml', definedIn: FAKE_CONFIG_PATH, sourceType: 'Test' } },
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Attempting to resolve plugin config path/,
        /Resolved plugin path as relative to main config base path/,
        /Using alternative config file for plugin directory/,
        /Registered plugin from config file/,
        /Plugin registrations from file complete/
      ],
    }),
  },
  {
    description: '1.2.17: Should handle plugin aliases defined in the main config file',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Aliases Only Config'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: {
        plugin_directory_aliases: { 'my-alias': '/custom/path' },
        plugins: { 'test-plugin': 'my-alias:plugin.config.yaml' }
      },
      fileSystem: { '/custom/path/plugin.config.yaml': { exists: true, isFile: true } },
      expectResult: {
        'test-plugin': {
          configPath: '/custom/path/plugin.config.yaml',
          definedIn: FAKE_CONFIG_PATH,
          sourceType: 'Aliases Only Config'
        }
      },
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Attempting to resolve alias/,
        /Alias resolution successful/,
        /Registered plugin directory alias/,
        /Attempting to resolve plugin config path/,
        /Resolved plugin path using alias/,
        /Plugin config path resolved to an existing file/,
        /Registered plugin from config file/,
        /Plugin registrations from file complete/
      ],
    })
  },
  {
    description: '1.2.18: Should return empty registrations if no plugins section exists',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'No Plugins Config'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { someOtherSetting: true },
      expectResult: {},
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Plugin registrations from file complete/
      ],
    })
  },
  {
    description: '1.2.19: Should return empty registrations if plugins section is empty',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [FAKE_CONFIG_PATH, FAKE_BASE_DIR, 'Empty Plugins Config'],
    ...makeFileRegistrationScenario({
      mainConfigPath: FAKE_CONFIG_PATH,
      yamlContent: { plugins: {} },
      expectResult: {},
      expectLogs: [
        /Attempting to get plugin registrations from file/,
        /Plugin registrations from file complete/
      ],
    })
  },
];
