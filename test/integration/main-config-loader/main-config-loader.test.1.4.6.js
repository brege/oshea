// test/integration/main-config-loader/main-config-loader.test.1.4.6.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.6)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for all relevant config types
    const mockProjectManifestConfigPath = '/cli/provided/config.yaml';
    const mockProjectManifestConfigContent = { cliSetting: 'cli value', common: 'cli common' };

    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgSetting: 'xdg value', common: 'xdg common' };

    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { bundledSetting: 'bundled value', common: 'bundled common' };

    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');
    const mockFactoryDefaultConfigContent = { factorySetting: 'factory default value', common: 'factory common' };

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync to make *only* the relevant config files for this test's prioritization exist.
        // The order of these stubbing calls matters if there are overlapping general/specific stubs.
        // We set specific stubs first for paths that should exist.
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG path also exists for prioritization test
        // Ensure other non-primary paths return false by default, for clean isolation.
        // This 'returns(false)' applies to any calls that don't match the specific 'withArgs' above.
        fsMock.existsSync.returns(false);


        // Set up loadYamlConfig for the paths that will be loaded.
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        // Also stub lower-priority config loads in case they are unexpectedly called
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test to prevent interference between tests
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.6 Test _initialize correctly prioritizes projectManifestConfigPath (from CLI) if it exists and useFactoryDefaultsOnly is false.', async () => {
            // Instantiate MainConfigLoader with a CLI path and useFactoryDefaultsOnly set to false.
            // Inject our mocked dependencies (fs, path, loadYamlConfig).
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // This is explicitly provided as the CLI path
                false, // useFactoryDefaultsOnly is false, allowing normal prioritization
                mockXdgBaseDir, // Provide a non-null xdgBaseDir for consistent path generation
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            // Execute the _initialize method, which performs the config loading logic
            await loaderInstance._initialize();

            // --- Assertions for Primary Config Selection ---
            // Verify that the primary config path is correctly identified as the CLI path
            expect(loaderInstance.primaryConfigPath).to.equal(mockProjectManifestConfigPath, 'primaryConfigPath should be the CLI path');
            // Verify the reason for loading the primary config
            expect(loaderInstance.primaryConfigLoadReason).to.equal("project (from --config)", 'primaryConfigLoadReason should indicate CLI source');
            // Verify the content of the primary config matches the mocked CLI content
            expect(loaderInstance.primaryConfig).to.deep.equal(mockProjectManifestConfigContent, 'primaryConfig should match content loaded from CLI path');

            // Verify that loadYamlConfig was called exactly once with the primary config path
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;

            // --- Crucial checks for Prioritization Order ---
            // Verify that loadYamlConfig for XDG config was NOT called *before* the CLI config load.
            // This ensures that the CLI path correctly took precedence for primary config selection.
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath))).to.be.false;
            // Verify that loadYamlConfig for default bundled config was NOT called *before* the CLI config load.
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath))).to.be.false;
            // Verify that loadYamlConfig for factory default config was NOT called *before* the CLI config load.
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath))).to.be.false;


            // --- Assertions for Secondary Config Contents ---
            // projectConfigContents should be the same as primary because projectManifestConfigPath was the primary source
            expect(loaderInstance.projectConfigContents).to.deep.equal(mockProjectManifestConfigContent, 'projectConfigContents should be loaded from the CLI path');
            // XDG config should also be loaded into xdgConfigContents as it exists and was not the primary source
            expect(loaderInstance.xdgConfigContents).to.deep.equal(mockXdgConfigContent, 'xdgConfigContents should be loaded from XDG path');
            // Default bundled config should NOT be loaded into xdgConfigContents or projectConfigContents in this flow
            expect(loaderInstance.defaultMainConfigPath in loaderInstance.xdgConfigContents).to.be.false;
            expect(loaderInstance.defaultMainConfigPath in loaderInstance.projectConfigContents).to.be.false;


            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
