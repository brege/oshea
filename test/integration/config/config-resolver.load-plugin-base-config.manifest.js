// test/integration/config/config-resolver.load-plugin-base-config.manifest.js

const { makeConfigResolverScenario } = require('./config-resolver.factory.js');
const sinon = require('sinon');

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
    description: '1.1.3: should load raw config, resolve CSS, and return a structured object',
    mainConfigStubs,
    setup: (mocks) => {
      mocks.mockDependencies.AssetResolver = {
        resolveAndMergeCss: sinon.stub()
      };
    },
    assertion: async (resolver, mocks, constants, expect) => {
      const { mockDependencies } = mocks;
      const fakeConfigPath = '/fake/plugin/plugin.config.yaml';
      const fakeAssetsPath = '/fake/plugin';
      const fakePluginName = 'my-plugin';
      const rawConfigData = { css_files: ['style.css'], inherit_css: true };
      const resolvedCssPaths = ['/fake/plugin/style.css'];

      mockDependencies.loadYamlConfig.withArgs(fakeConfigPath).resolves(rawConfigData);
      mockDependencies.AssetResolver.resolveAndMergeCss
        .withArgs(rawConfigData.css_files, fakeAssetsPath, [], false, fakePluginName, fakeConfigPath)
        .returns(resolvedCssPaths);

      const result = await resolver._loadPluginBaseConfig(fakeConfigPath, fakeAssetsPath, fakePluginName);

      expect(mockDependencies.loadYamlConfig.calledOnceWith(fakeConfigPath)).to.be.true;
      expect(mockDependencies.AssetResolver.resolveAndMergeCss.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        rawConfig: rawConfigData,
        resolvedCssPaths: resolvedCssPaths,
        inheritCss: true,
        actualPath: fakeConfigPath,
      });
    }
  }),
];
