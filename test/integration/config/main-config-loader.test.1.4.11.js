// test/integration/config/main-config-loader.test.1.4.11.js
const { mainConfigLoaderPath, defaultConfigPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.11)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleErrorStub;
    let consoleWarnStub;
    const testProjectRoot = '/app/test-root';

    beforeEach(() => {
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();
        consoleErrorStub = sinon.stub(console, 'error');
        consoleWarnStub = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.11.a Verify _initialize sets primaryConfig to an empty object if the determined configPathToLoad does not exist.', async () => {
            fsMock.existsSync.returns(false);
            const loader = new MainConfigLoader(
                testProjectRoot, null, false, null,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loader._initialize();

            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object');
            expect(loader.primaryConfigPath).to.be.null;
            expect(loader.primaryConfigLoadReason).to.equal("none found", 'primaryConfigLoadReason should be "none found"');
            expect(loadYamlConfigStub.called).to.be.false;
            expect(consoleWarnStub.calledOnce).to.be.true;
            expect(loader._initialized).to.be.true;
        });

        it('1.4.11.b Verify _initialize sets primaryConfig to an empty object if the determined configPathToLoad exists but fails to load.', async () => {
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(defaultConfigPath).returns(true);
            fsMock.existsSync.withArgs(factoryDefaultConfigPath).returns(true);

            const loadError = new Error('Simulated Malformed YAML error');
            loadYamlConfigStub.withArgs(defaultConfigPath).rejects(loadError);

            const loader = new MainConfigLoader(
                testProjectRoot, null, false, null,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loader._initialize();

            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object despite load failure');
            expect(loader.primaryConfigPath).to.equal(defaultConfigPath, 'primaryConfigPath should still be the path that was attempted');
            expect(loader.primaryConfigLoadReason).to.equal("bundled main", 'primaryConfigLoadReason should reflect the attempted primary path');
            expect(loadYamlConfigStub.calledOnceWith(defaultConfigPath)).to.be.true;
            expect(consoleErrorStub.calledOnce).to.be.true;
            expect(loader._initialized).to.be.true;
        });
    });
});
