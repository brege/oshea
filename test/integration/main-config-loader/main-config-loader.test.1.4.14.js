// test/integration/main-config-loader/main-config-loader.test.1.4.14.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.14)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleLogStub;
    let consoleWarnStub;

    const testProjectRoot = '/app/test-root';
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgPrimary: 'xdg primary config value', featureA: true };

    const mockProjectManifestConfigPath = '/cli/secondary/config.yaml';
    const mockProjectManifestConfigContent = { projectManifestSecondary: 'project manifest secondary config value', featureB: false };

    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');

    beforeEach(() => {
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();
        consoleLogStub = sinon.stub(console, 'log'); // Removed .callThrough()
        consoleWarnStub = sinon.stub(console, 'warn'); // Removed .callThrough()


        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true);


        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.14 Test _initialize correctly prioritizes projectManifestConfigPath (from CLI) as primary and loads XDG as secondary.', async () => {
            const loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath,
                false,
                mockXdgBaseDir,
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            await loaderInstance._initialize();

            expect(loaderInstance.primaryConfigPath).to.equal(mockProjectManifestConfigPath, 'primaryConfigPath should be the Project Manifest path from CLI');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("project (from --config)", 'primaryConfigLoadReason should be "project (from --config)"');
            expect(loaderInstance.primaryConfig.cliManifestSetting).to.equal(mockProjectManifestConfigContent.cliManifestSetting, 'primaryConfig should match Project Manifest content');
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;

            expect(loaderInstance.xdgConfigContents.xdgPrimary).to.equal(mockXdgConfigContent.xdgPrimary, 'xdgConfigContents should contain loaded XDG content');
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledAfter(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath))).to.be.true;

            expect(loaderInstance._initialized).to.be.true;
            expect(consoleWarnStub.called).to.be.false;
            expect(consoleLogStub.called).to.be.false; // MODIFIED: Assert that console.log is not called by the test.
        });
    });
});
