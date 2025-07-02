// test/integration/config/main-config-loader.test.1.4.9.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/config/main_config_loader');
const { factoryDefaultConfigPath } = require('@paths');

describe('MainConfigLoader (1.4.9)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    const mockFactoryDefaultConfigContent = { factorySetting: 'fallback factory default value', common: 'fallback common' };

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
        it('1.4.9 Verify _initialize falls back to factoryDefaultMainConfigPath if no other primary main configuration file is found.', async () => {
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null,
                false,
                null,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loaderInstance._initialize();

            expect(loaderInstance.primaryConfigPath).to.equal(factoryDefaultConfigPath, 'primaryConfigPath should be the factory default fallback path');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("factory default fallback", 'primaryConfigLoadReason should be "factory default fallback"');
            expect(loaderInstance.primaryConfig).to.deep.equal(mockFactoryDefaultConfigContent, 'primaryConfig should match content loaded from factory default path');
            expect(loadYamlConfigStub.withArgs(factoryDefaultConfigPath).calledOnce).to.be.true;
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
