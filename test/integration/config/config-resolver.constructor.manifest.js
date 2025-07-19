// test/integration/config/config-resolver.constructor.manifest.js

const { makeConfigResolverScenario } = require('./config-resolver.factory.js');

module.exports = [
  makeConfigResolverScenario({
    description: '1.1.1: should correctly load configurations and set internal properties',
    useImperativeSetup: true,
    mainConfigStubs: {
      getPrimaryMainConfig: {
        config: { collections_root: '/fake/collections/root', some_other_key: 'value' },
        path: '/fake/path/to/main-config.yaml',
        reason: 'test'
      },
      getXdgMainConfig: { config: {}, path: null, baseDir: null },
      getProjectManifestConfig: { config: {}, path: null, baseDir: null },
    },
    expectations: {
      getPrimaryMainConfigCalled: true,
      primaryMainConfig: { collections_root: '/fake/collections/root', some_other_key: 'value' },
      primaryMainConfigPathActual: '/fake/path/to/main-config.yaml',
      resolvedCollRoot: '/fake/collections/root',
      pluginConfigLoaderCalled: true,
      pluginRegistryBuilderCalled: true,
    }
  }),
];

