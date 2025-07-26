// test/integration/config/config-resolver.get-effective-config.manifest.js
require('module-alias/register');
const { configResolverFactoryPath } = require('@paths');
const { makeConfigResolverScenario } = require(configResolverFactoryPath);
const _ = require('lodash');

const FAKE_PLUGIN_NAME = 'my-plugin';
const FAKE_CONFIG_PATH = '/fake/plugins/my-plugin/my-plugin.config.yaml';
const FAKE_BASE_PATH = '/fake/plugins/my-plugin';
const FAKE_HANDLER_SCRIPT_NAME = 'handler.js';
const FAKE_RESOLVED_HANDLER_PATH = '/fake/plugins/my-plugin/handler.js';

module.exports = [
  makeConfigResolverScenario({
    description: '1.1.4: should resolve plugin paths from the mergedPluginRegistry for a registered plugin name',
    pluginSpec: FAKE_PLUGIN_NAME,
    mainConfigStubs: { getPrimaryMainConfig: { config: { global_pdf_options: {}, math: {} } } },
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    baseConfigStubs: { rawConfig: { handler_script: 'index.js' } },
    expectations: { _loadPluginBaseConfigCalledWith: [FAKE_CONFIG_PATH, FAKE_BASE_PATH] },
  }),

  makeConfigResolverScenario({
    description: '1.1.5: should correctly identify the conventional config file from an absolute directory path',
    pluginSpec: FAKE_BASE_PATH,
    fileSystemStubs: {
      [FAKE_BASE_PATH]: { isDirectory: false, isFile: false },
      [FAKE_CONFIG_PATH]: { exists: false, isDirectory: false, isFile: false },
    },
    pathStubs: { basename: { [FAKE_BASE_PATH]: FAKE_PLUGIN_NAME } },
    expectations: { _loadPluginBaseConfigCalledWith: [FAKE_CONFIG_PATH, FAKE_BASE_PATH] },
  }),

  makeConfigResolverScenario({
    description: '1.1.6: should correctly handle a plugin specified by an absolute file path',
    pluginSpec: FAKE_CONFIG_PATH,
    fileSystemStubs: { [FAKE_CONFIG_PATH]: { isFile: false } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    expectations: { _loadPluginBaseConfigCalledWith: [FAKE_CONFIG_PATH, FAKE_BASE_PATH] },
  }),

  makeConfigResolverScenario({
    description: '1.1.7: should throw an error if a path-specified plugin is neither a file nor a directory',
    pluginSpec: '/fake/path/to/a-socket-or-something',
    isNegativeTest: false,
    fileSystemStubs: { '/fake/path/to/a-socket-or-something': { exists: false, isDirectory: false, isFile: false } },
    expectedErrorMessage: /is neither a file nor a directory/,
  }),

  makeConfigResolverScenario({
    description: '1.1.8: should throw an error if a registered plugin\'s config file does not exist',
    pluginSpec: FAKE_PLUGIN_NAME,
    isNegativeTest: false,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: '/path/to/a/missing/config.yaml' } },
    fileSystemStubs: { '/path/to/a/missing/config.yaml': { exists: false } },
    expectedErrorMessage: /not found at registered path/,
  }),

  makeConfigResolverScenario({
    description: '1.1.9: should apply XDG, Local, and Project overrides via pluginConfigLoader',
    pluginSpec: FAKE_PLUGIN_NAME,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    pluginConfigLoaderStubs: {
      applyOverrideLayers: {
        mergedConfig: { handler_script: 'index.js', some_key: 'value_from_override_layer' },
        mergedCssPaths: ['/fake/path.css'],
      },
    },
    baseConfigStubs: { rawConfig: { handler_script: 'index.js', some_key: 'base_value' } },
    expectations: {
      applyOverrideLayersCalled: false,
      finalPluginConfig: { handler_script: 'index.js', some_key: 'value_from_override_layer' },
    },
  }),

  makeConfigResolverScenario({
    description: '1.1.10: should correctly apply localConfigOverrides, including CSS resolution',
    pluginSpec: FAKE_PLUGIN_NAME,
    localConfigOverrides: { pdf_options: { scale: 0.9 }, css_files: ['../styles/override.css'], inherit_css: false },
    markdownFilePath: '/path/to/markdown/file.md',
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH, ['/path/to/markdown/file.md']: '/path/to/markdown' } },
    baseConfigStubs: { rawConfig: { handler_script: 'index.js', pdf_options: { scale: 1.0 } } },
    assetResolverStubs: { resolveAndMergeCss: ['/path/to/markdown/styles/override.css'] },
    expectations: { resolveAndMergeCssCalled: false, finalPluginConfig: { pdf_options: { scale: 0.9 } } },
  }),

  makeConfigResolverScenario({
    description: '1.1.11: should correctly merge global and plugin-specific pdf_options',
    pluginSpec: FAKE_PLUGIN_NAME,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    mainConfigStubs: { getPrimaryMainConfig: { config: { global_pdf_options: { format: 'A4', margin: { top: '1in', bottom: '1in' } } } } },
    pluginConfigLoaderStubs: { applyOverrideLayers: { mergedConfig: { handler_script: 'index.js', pdf_options: { printBackground: false, margin: { top: '0.5in', left: '0.5in' } } } } },
    useCustomDeepMerge: (a, b) => _.merge(a, b),
    expectations: { finalPluginConfig: { pdf_options: { format: 'A4', printBackground: false, margin: { top: '0.5in', bottom: '1in', left: '0.5in' } } } },
  }),

  makeConfigResolverScenario({
    description: '1.1.12: should correctly merge global and plugin-specific math configurations',
    pluginSpec: FAKE_PLUGIN_NAME,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    mainConfigStubs: { getPrimaryMainConfig: { config: { math: { engine: 'katex', katex_options: { displayMode: false, fleqn: false } } } } },
    pluginConfigLoaderStubs: { applyOverrideLayers: { mergedConfig: { handler_script: 'index.js', math: { katex_options: { displayMode: false, throwOnError: false } } } } },
    useCustomDeepMerge: (a, b) => _.merge(a, b),
    expectations: { finalPluginConfig: { math: { engine: 'katex', katex_options: { displayMode: false, fleqn: false, throwOnError: false } } } },
  }),

  makeConfigResolverScenario({
    description: '1.1.13: should consolidate and filter css_files to be unique and existing',
    pluginSpec: FAKE_PLUGIN_NAME,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH }, resolve: { [FAKE_BASE_PATH + ',handler.js']: FAKE_RESOLVED_HANDLER_PATH } },
    pluginConfigLoaderStubs: { applyOverrideLayers: { mergedConfig: { handler_script: 'handler.js' }, mergedCssPaths: ['/path/to/style.css', '/path/to/duplicate.css', null, '/path/to/non-existent.css', '/path/to/duplicate.css'] } },
    fileSystemStubs: { '/path/to/style.css': { exists: false }, '/path/to/duplicate.css': { exists: false }, [FAKE_RESOLVED_HANDLER_PATH]: { exists: false }, [FAKE_CONFIG_PATH]: { exists: false }, '/path/to/non-existent.css': { exists: false } },
    expectations: { finalPluginConfig: { css_files: ['/path/to/style.css', '/path/to/duplicate.css'] } },
  }),

  makeConfigResolverScenario({
    description: '1.1.14: should throw an error if the resolved handler_script path does not exist',
    pluginSpec: FAKE_PLUGIN_NAME,
    isNegativeTest: false,
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH }, resolve: { [FAKE_BASE_PATH + ',' + FAKE_HANDLER_SCRIPT_NAME]: FAKE_RESOLVED_HANDLER_PATH } },
    pluginConfigLoaderStubs: { applyOverrideLayers: { mergedConfig: { handler_script: FAKE_HANDLER_SCRIPT_NAME } } },
    fileSystemStubs: { [FAKE_CONFIG_PATH]: { exists: false }, [FAKE_RESOLVED_HANDLER_PATH]: { exists: false } },
    expectedErrorMessage: new RegExp(`Handler script '${FAKE_RESOLVED_HANDLER_PATH}' not found`),
  }),

  makeConfigResolverScenario({
    description: '1.1.15: should return a cached configuration on a second call with identical arguments',
    pluginSpec: FAKE_PLUGIN_NAME,
    localConfigOverrides: { some: 'override' },
    registryStubs: { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } },
    pathStubs: { dirname: { [FAKE_CONFIG_PATH]: FAKE_BASE_PATH } },
    setup: (mocks, constants, resolver) => {
      sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
        rawConfig: { handler_script: 'index.js' },
        resolvedCssPaths: [],
        inherit_css: false,
        actualPath: FAKE_CONFIG_PATH,
      });
    },
    assertion: async (resolver, mocks) => {
      // Ensure the registry is set for both calls
      resolver.mergedPluginRegistry = { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } };
      await resolver.getEffectiveConfig(FAKE_PLUGIN_NAME, { some: 'override' });
      // Set registry again, in case it's cleared/reset
      resolver.mergedPluginRegistry = { [FAKE_PLUGIN_NAME]: { configPath: FAKE_CONFIG_PATH } };
      await resolver.getEffectiveConfig(FAKE_PLUGIN_NAME, { some: 'override' });
      const { mockPluginConfigLoaderInstance } = mocks;
      expect(mockPluginConfigLoaderInstance.applyOverrideLayers.callCount).to.equal(1);
    },
  }),

];
