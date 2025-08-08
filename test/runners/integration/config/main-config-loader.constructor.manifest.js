// test/runners/integration/config/main-config-loader.constructor.manifest.js
require('module-alias/register');
const { mainConfigLoaderFactoryPath } = require('@paths');
const { makeMainConfigLoaderScenario } = require(mainConfigLoaderFactoryPath);

const path = require('path');

module.exports = [
  makeMainConfigLoaderScenario({
    description: '1.4.1: Should correctly initialize path properties based on projectRoot',
    constructorArgs: ['/test/project/root'],
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.projectRoot).to.equal('/test/project/root');
      expect(loader.defaultMainConfigPath).to.equal(constants.DEFAULT_CONFIG_PATH);
      expect(loader.factoryDefaultMainConfigPath).to.equal(constants.FACTORY_DEFAULT_CONFIG_PATH);
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.2: Should determine xdgBaseDir using XDG_CONFIG_HOME if set',
    constructorArgs: ['/app/test-root', null, false, null],
    envStubs: { XDG_CONFIG_HOME: '/custom/xdg/config' },
    assertion: (loader, mocks, constants, expect) => {
      const expectedXdgBaseDir = path.join('/custom/xdg/config', 'oshea');
      expect(loader.xdgBaseDir).to.equal(expectedXdgBaseDir);
      expect(loader.xdgGlobalConfigPath).to.equal(path.join(expectedXdgBaseDir, 'config.yaml'));
      expect(mocks.mockDependencies.os.homedir.called).to.be.false;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.2.a: Should determine xdgBaseDir using os.homedir() as a fallback',
    constructorArgs: ['/app/test-root', null, false, null],
    assertion: (loader, mocks, constants, expect) => {
      const expectedXdgBaseDir = path.join(constants.MOCK_OS_HOME_DIR, '.config', 'oshea');
      expect(loader.xdgBaseDir).to.equal(expectedXdgBaseDir);
      expect(mocks.mockDependencies.os.homedir.calledOnce).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.3: Should use the provided xdgBaseDir parameter over environment variables',
    constructorArgs: ['/app/test-root', null, false, '/custom/path/to/xdg'],
    envStubs: { XDG_CONFIG_HOME: '/should/be/ignored' },
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.xdgBaseDir).to.equal('/custom/path/to/xdg');
      expect(mocks.mockDependencies.os.homedir.called).to.be.false;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.4: Should correctly set properties from constructor arguments',
    constructorArgs: ['/root', '/cli/config.yaml', true, '/xdg/dir'],
    assertion: (loader, mocks, constants, expect) => {
      expect(loader.projectManifestConfigPath).to.equal('/cli/config.yaml');
      expect(loader.useFactoryDefaultsOnly).to.be.true;
    },
  }),
];
