// test/integration/config/plugin-config-loader.loadSingleLayer.manifest.js
const { makePluginConfigLoaderScenario } = require('./plugin-config-loader.factory.js');

module.exports = [
  makePluginConfigLoaderScenario({
    description: '1.6.2: Should load a valid YAML config and resolve CSS paths',
    constructorArgs: [null, {}, null, null, {}, null, false],
    methodName: '_loadSingleConfigLayer',
    methodArgs: ['/path/to/plugin/my-plugin.config.yaml', '/path/to/plugin', 'my-plugin'],
    fsExistsStubs: { '/path/to/plugin/my-plugin.config.yaml': true },
    loadYamlConfigStubs: {
      '/path/to/plugin/my-plugin.config.yaml': {
        css_files: ['main.css', 'theme.css'],
        inherit_css: true,
        someSetting: 'value',
      }
    },
    assetResolverStubs: {
      '[["main.css","theme.css"],"/path/to/plugin",[],false,"my-plugin","/path/to/plugin/my-plugin.config.yaml"]': ['/resolved/main.css', '/resolved/theme.css']
    },
    assertion: async (result, loader, mocks, constants, expect) => {
      expect(result).to.deep.equal({
        rawConfig: {
          css_files: ['main.css', 'theme.css'],
          inherit_css: true,
          someSetting: 'value',
        },
        resolvedCssPaths: ['/resolved/main.css', '/resolved/theme.css'],
        inherit_css: true,
        actualPath: '/path/to/plugin/my-plugin.config.yaml',
      });
      expect(loader._rawPluginYamlCache).to.have.property('/path/to/plugin/my-plugin.config.yaml-/path/to/plugin');
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.3: Should use the cache for subsequent calls',
    constructorArgs: [null, {}, null, null, {}, null, false],
    methodName: '_loadSingleConfigLayer',
    methodArgs: ['/path/to/cached.config.yaml', '/path/to', 'cached-plugin'],
    fsExistsStubs: { '/path/to/cached.config.yaml': true },
    loadYamlConfigStubs: { '/path/to/cached.config.yaml': { setting: 'value' } },
    assertion: async (result, loader, mocks, constants, expect) => {
      await loader._loadSingleConfigLayer('/path/to/cached.config.yaml', '/path/to', 'cached-plugin');
      expect(mocks.mockDependencies.configUtils.loadYamlConfig.calledOnce).to.be.true;
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.4: should return null if configFilePath does not exist',
    constructorArgs: [null, {}, null, null, {}, null, false],
    methodName: '_loadSingleConfigLayer',
    methodArgs: ['/path/to/non-existent.config.yaml', '/path/to', 'non-existent-plugin'],
    fsExistsStubs: { '/path/to/non-existent.config.yaml': false },
    assertion: async (result, loader, mocks, constants, expect, logs) => {
      expect(result).to.be.null;
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('not provided or does not exist'))).to.be.true;
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.4: should return null if configFilePath is null or undefined',
    constructorArgs: [null, {}, null, null, {}, null, false],
    methodName: '_loadSingleConfigLayer',
    methodArgs: [null, '/path/to', 'null-path-plugin'],
    assertion: async (result, loader, mocks, constants, expect, logs) => {
      expect(result).to.be.null;
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('not provided or does not exist: null'))).to.be.true;

      const resultUndefined = await loader._loadSingleConfigLayer(undefined, '/path/to', 'undefined-path-plugin');
      expect(resultUndefined).to.be.null;
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('not provided or does not exist: undefined'))).to.be.true;
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.5: should handle errors during YAML parsing or file reading gracefully, returning an empty config object',
    constructorArgs: [null, {}, null, null, {}, null, false],
    methodName: '_loadSingleConfigLayer',
    methodArgs: ['/path/to/bad.config.yaml', '/path/to', 'bad-plugin'],
    fsExistsStubs: { '/path/to/bad.config.yaml': true },
    loadYamlConfigStubs: { '/path/to/bad.config.yaml': new Error('YAML Parse Error') },
    assertion: async (result, loader, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({ rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null });
      expect(logs.some(log => log.level === 'error' && log.msg.includes('loading plugin configuration layer'))).to.be.true;
    },
  }),
];
