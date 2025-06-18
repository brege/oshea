// test/integration/main-config-loader/main-config-loader.test.1.4.15.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.15)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleWarnStub; // Stub for console.warn messages
    let consoleErrorStub; // Stub for console.error messages
    let consoleLogStub; // Stub for console.log debug messages

    const testProjectRoot = '/app/test-root';
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { bundledPrimary: 'bundled config loaded' };

    const mockProjectManifestConfigPath = '/cli/non-primary/config.yaml';

    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');


    beforeEach(() => {
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        consoleWarnStub = sinon.stub(console, 'warn'); // Removed .callThrough()
        consoleErrorStub = sinon.stub(console, 'error'); // Removed .callThrough()
        consoleLogStub = sinon.stub(console, 'log'); // Removed .callThrough()

    });

    afterEach(() => {
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.15.a Verify _initialize sets projectConfigContents to an empty object if projectManifestConfigPath does not exist.', async () => {
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true);
            fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true);
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(false);

            loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);

            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath,
                false,
                mockXdgBaseDir,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loader._initialize();

            expect(loader.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            expect(fsMock.existsSync.calledWith(mockProjectManifestConfigPath)).to.be.true;
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).called).to.be.false;

            const warningCalls = consoleWarnStub.getCalls();
            const expectedWarningMessagePart = 'WARN (MainConfigLoader): Project manifest config path provided but file does not exist:';
            const foundWarning = warningCalls.some(call =>
                call.args[0].includes(expectedWarningMessagePart)
            );
            expect(foundWarning).to.be.true;
            expect(consoleErrorStub.called).to.be.false;
            expect(loader._initialized).to.be.true;
        });

        it('1.4.15.b Verify _initialize handles failed primary load when projectManifestConfigPath exists but fails to load.', async () => {
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true);
            fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true);

            const loadError = new Error('Simulated Project Manifest primary load failure');
            loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).rejects(loadError);

            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath,
                false,
                mockXdgBaseDir,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loader._initialize();

            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object after load failure');
            expect(loader.primaryConfigPath).to.equal(mockProjectManifestConfigPath, 'primaryConfigPath should be the attempted CLI path');
            expect(loader.primaryConfigLoadReason).to.equal("project (from --config)", 'primaryConfigLoadReason should reflect CLI source');
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;
            expect(consoleErrorStub.calledOnce).to.be.true;
            expect(consoleErrorStub.getCall(0).args[0]).to.match(/ERROR \(MainConfigLoader\): loading primary main configuration from/);
            expect(loader.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be empty as primary load failed');
            expect(consoleWarnStub.called).to.be.false;
            expect(loader._initialized).to.be.true;
        });
    });
});
