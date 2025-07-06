// test/integration/config/main-config-loader.test.1.4.5.js
const { mainConfigLoaderPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.5)', () => {
  let fsMock;
  let loadYamlConfigStub;
  const testProjectRoot = '/app/test-root';
  let loaderInstance;

  const mockFactoryDefaultConfigContent = { defaultSetting: 'factory default value', plugins: { example: true } };
  const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
  const mockProjectManifestConfigPath = '/some/cli/path/cli-config.yaml';

  beforeEach(() => {
    fsMock = {
      existsSync: sinon.stub()
    };
    loadYamlConfigStub = sinon.stub();

    fsMock.existsSync.returns(false);
    fsMock.existsSync.withArgs(factoryDefaultConfigPath).returns(true);

    loadYamlConfigStub.withArgs(factoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('_initialize()', () => {
    it('1.4.5 Verify _initialize correctly selects factoryDefaultMainConfigPath as primary when useFactoryDefaultsOnly is true.', async () => {
      loaderInstance = new MainConfigLoader(
        testProjectRoot,
        mockProjectManifestConfigPath,
        true, // useFactoryDefaultsOnly
        mockXdgBaseDir,
        { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
      );

      await loaderInstance._initialize();

      expect(loaderInstance.primaryConfigPath).to.equal(factoryDefaultConfigPath, 'primaryConfigPath should be factory default');
      expect(loaderInstance.primaryConfigLoadReason).to.equal('factory default', 'primaryConfigLoadReason should be "factory default"');
      expect(loaderInstance.primaryConfig).to.deep.equal(mockFactoryDefaultConfigContent, 'primaryConfig should match mocked factory default content');
      expect(loadYamlConfigStub.calledOnceWith(factoryDefaultConfigPath)).to.be.true;

      expect(fsMock.existsSync.withArgs(factoryDefaultConfigPath).calledOnce).to.be.true;

      expect(fsMock.existsSync.withArgs(loaderInstance.projectManifestConfigPath).called).to.be.false;
      expect(fsMock.existsSync.withArgs(loaderInstance.xdgGlobalConfigPath).called).to.be.false;
      expect(fsMock.existsSync.withArgs(loaderInstance.defaultMainConfigPath).called).to.be.false;

      expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
      expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');

      expect(loaderInstance._initialized).to.be.true;
    });
  });
});
