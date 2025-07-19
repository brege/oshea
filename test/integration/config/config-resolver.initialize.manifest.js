// test/integration/config/config-resolver.initialize.manifest.js

const { makeConfigResolverScenario } = require('./config-resolver.factory.js');

const mainConfigStubs = {
  getPrimaryMainConfig: {
    config: { collections_root: '/fake/collections/root' },
    path: '/fake/path/to/main-config.yaml',
    reason: 'test'
  },
  getXdgMainConfig: { config: {}, path: null, baseDir: null },
  getProjectManifestConfig: { config: {}, path: null, baseDir: null },
};

module.exports = [
  makeConfigResolverScenario({
    description: '1.1.2: should not rebuild the registry on a second call if conditions are unchanged',
    mainConfigStubs,
    assertion: async (resolver, mocks) => {
      await resolver._initializeResolverIfNeeded();
      expect(mocks.mockDependencies.PluginRegistryBuilder.callCount).to.equal(1);
    }
  }),
  makeConfigResolverScenario({
    description: '1.1.2: should rebuild the registry if useFactoryDefaultsOnly changes between calls',
    mainConfigStubs,
    assertion: async (resolver, mocks) => {
      resolver.useFactoryDefaultsOnly = true;
      await resolver._initializeResolverIfNeeded();
      expect(mocks.mockDependencies.PluginRegistryBuilder.callCount).to.equal(2);
    }
  }),
];

