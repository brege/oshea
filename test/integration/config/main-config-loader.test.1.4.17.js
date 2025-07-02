// test/integration/config/main-config-loader.test.1.4.17.js
const { mainConfigLoaderPath, defaultConfigPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.17)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    const mockDefaultMainConfigContent = { setting: 'value', modules: { active: true }, plugins: { basic: 'enabled' } };

    beforeEach(() => {
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(defaultConfigPath).returns(true);
        fsMock.existsSync.withArgs(factoryDefaultConfigPath).returns(true);

        loadYamlConfigStub.withArgs(defaultConfigPath).resolves(mockDefaultMainConfigContent);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getPrimaryMainConfig()', () => {
        it('1.4.17 Verify getPrimaryMainConfig returns the primary configuration object, including the added projectRoot property, along with its path, base directory, and load reason.', async () => {
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null,
                false,
                null,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            const primaryConfigResult = await loaderInstance.getPrimaryMainConfig();

            expect(primaryConfigResult).to.be.an('object', 'The returned result should be an object');
            expect(primaryConfigResult).to.have.all.keys(['config', 'path', 'baseDir', 'reason']);

            expect(primaryConfigResult.config).to.deep.equal({
                ...mockDefaultMainConfigContent,
                projectRoot: testProjectRoot
            }, 'The config object should contain the loaded content and the projectRoot');

            expect(primaryConfigResult.path).to.equal(defaultConfigPath, 'The path property should match the primary config path');
            expect(primaryConfigResult.baseDir).to.equal(path.dirname(defaultConfigPath), 'The baseDir should be the directory of the primary config path');
            expect(primaryConfigResult.reason).to.equal("bundled main", 'The reason property should indicate "bundled main"');
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
