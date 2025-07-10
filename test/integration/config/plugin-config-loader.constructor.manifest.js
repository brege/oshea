// test/integration/config/plugin-config-loader.constructor.manifest.js
const { makePluginConfigLoaderScenario } = require('./plugin-config-loader.factory.js');

module.exports = [
  makePluginConfigLoaderScenario({
    description: '1.6.1: Should correctly initialize properties from constructor arguments',
    constructorArgs: [
      '/xdg/base', { xdg: 'config' }, '/xdg/path',
      '/proj/base', { proj: 'config' }, '/proj/path',
      false,
    ],
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.xdgBaseDir).to.equal('/xdg/base');
      expect(loader.xdgMainConfig).to.deep.equal({ xdg: 'config' });
      expect(loader.xdgMainConfigPath).to.equal('/xdg/path');
      expect(loader.projectBaseDir).to.equal('/proj/base');
      expect(loader.projectMainConfig).to.deep.equal({ proj: 'config' });
      expect(loader.projectMainConfigPath).to.equal('/proj/path');
      expect(loader.useFactoryDefaultsOnly).to.be.false;
      expect(loader._rawPluginYamlCache).to.deep.equal({});
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.1: should set xdgMainConfig to an empty object if null or undefined',
    constructorArgs: ['/xdg/base', null, '/xdg/path', '/proj/base', {}, '/proj/path', false],
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.xdgMainConfig).to.deep.equal({});
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.1: should set projectMainConfig to an empty object if null or undefined',
    constructorArgs: ['/xdg/base', {}, '/xdg/path', '/proj/base', null, '/proj/path', false],
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.projectMainConfig).to.deep.equal({});
    },
  }),
];
