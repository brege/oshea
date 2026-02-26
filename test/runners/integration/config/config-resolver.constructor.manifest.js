// test/runners/integration/config/config-resolver.constructor.manifest.js
require('module-alias/register');
const { configResolverFactoryPath } = require('@paths');

const { makeConfigResolverScenario } = require(configResolverFactoryPath);

module.exports = [
  makeConfigResolverScenario({
    description:
      '1.1.1: should correctly load configurations and set internal properties',
    useImperativeSetup: true,
    mainConfigStubs: {
      getPrimaryMainConfig: {
        config: {
          plugins_root: '/fake/plugins/root',
          some_other_key: 'value',
        },
        path: '/fake/path/to/main-config.yaml',
        reason: 'test',
      },
      getXdgMainConfig: { config: {}, path: null, baseDir: null },
      getProjectManifestConfig: { config: {}, path: null, baseDir: null },
    },
    expectations: {
      getPrimaryMainConfigCalled: true,
      primaryMainConfig: {
        plugins_root: '/fake/plugins/root',
        some_other_key: 'value',
      },
      primaryMainConfigPathActual: '/fake/path/to/main-config.yaml',
      resolvedPluginsRoot: '/fake/plugins/root',
      pluginConfigLoaderCalled: true,
      pluginRegistryBuilderCalled: true,
    },
  }),
];
