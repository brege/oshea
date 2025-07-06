// test/integration/config/main-config-loader.test.1.4.8.js
const { mainConfigLoaderPath, defaultConfigPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.8)', () => {
  let fsMock;
  let loadYamlConfigStub;
  const testProjectRoot = '/app/test-root';
  let loaderInstance;

  const mockDefaultMainConfigContent = { bundledSetting: 'bundled value', common: 'bundled primary common' };
  const mockFactoryDefaultConfigContent = { factorySetting: 'factory default value', common: 'factory common' };

  beforeEach(() => {
    fsMock = {
      existsSync: sinon.stub()
    };
    loadYamlConfigStub = sinon.stub();

    fsMock.existsSync.returns(false);
    fsMock.existsSync.withArgs(defaultConfigPath).returns(true);
    fsMock.existsSync.withArgs(factoryDefaultConfigPath).returns(true);

    loadYamlConfigStub.withArgs(defaultConfigPath).resolves(mockDefaultMainConfigContent);
    loadYamlConfigStub.withArgs(factoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('_initialize()', () => {
    it('1.4.8 Test _initialize correctly prioritizes defaultMainConfigPath (bundled) if it exists and no higher-priority config is found.', async () => {
      loaderInstance = new MainConfigLoader(
        testProjectRoot,
        null,
        false,
        null,
        { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
      );

      await loaderInstance._initialize();

      expect(loaderInstance.primaryConfigPath).to.equal(defaultConfigPath, 'primaryConfigPath should be the bundled path');
      expect(loaderInstance.primaryConfigLoadReason).to.equal('bundled main', 'primaryConfigLoadReason should be "bundled main"');
      expect(loaderInstance.primaryConfig).to.deep.equal(mockDefaultMainConfigContent, 'primaryConfig should match content loaded from bundled path');
      expect(loadYamlConfigStub.withArgs(defaultConfigPath).calledOnce).to.be.true;
      expect(loadYamlConfigStub.withArgs(factoryDefaultConfigPath).calledBefore(loadYamlConfigStub.withArgs(defaultConfigPath))).to.be.false;
      expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
      expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
      expect(loaderInstance._initialized).to.be.true;
    });
  });
});
