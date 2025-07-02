// test/integration/config/main-config-loader.test.1.4.10.js
const { mainConfigLoaderPath, defaultConfigPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.10)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    const mockDefaultMainConfigContent = { primaryTestSetting: 'bundled config loaded', version: '1.0', modules: { moduleA: true } };

    beforeEach(() => {
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(defaultConfigPath).returns(true);
        fsMock.existsSync.withArgs(factoryDefaultConfigPath).returns(true);

        loadYamlConfigStub.withArgs(defaultConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(factoryDefaultConfigPath).resolves({});
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.10 Test _initialize loads the selected primary config file correctly and sets primaryConfig, primaryConfigPath, and primaryConfigLoadReason.', async () => {
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null,
                false,
                null,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loaderInstance._initialize();

            expect(loaderInstance.primaryConfigPath).to.equal(defaultConfigPath, 'primaryConfigPath should be the bundled config path');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("bundled main", 'primaryConfigLoadReason should be "bundled main"');
            expect(loaderInstance.primaryConfig).to.deep.equal(mockDefaultMainConfigContent, 'primaryConfig should match the loaded bundled config content');
            expect(loadYamlConfigStub.withArgs(defaultConfigPath).calledOnce).to.be.true;
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
