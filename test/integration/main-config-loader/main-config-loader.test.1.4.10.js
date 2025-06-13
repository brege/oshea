// test/integration/main-config-loader/main-config-loader.test.1.4.10.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.10)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define the path and mock content for the chosen primary config (bundled config)
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { primaryTestSetting: 'bundled config loaded', version: '1.0', modules: { moduleA: true } };

    // Paths for higher-priority configs that should NOT exist in this test for primary selection
    const mockProjectManifestConfigPath = '/cli/provided/config.yaml';
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    // The factory default path must exist, as it's the ultimate fallback if nothing else is found.
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        // Set all paths to return false by default, then explicitly set bundled config and factory default to exist.
        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // This one exists for primary selection
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists


        // Set up loadYamlConfig for the expected primary path
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        // Also stub for factory default, even if not primary, as it might be checked or loaded in other contexts
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves({});
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.10 Test _initialize loads the selected primary config file correctly and sets primaryConfig, primaryConfigPath, and primaryConfigLoadReason.', async () => {
            // Instantiate MainConfigLoader to ensure defaultMainConfigPath is selected as primary.
            // This setup avoids CLI config, XDG config, and explicitly setting factory defaults.
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli: not provided, so CLI config is not applied
                false, // useFactoryDefaultsOnly: false, so factory default is not forced as primary
                null, // xdgBaseDir: not provided, so XDG global config is not found
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject mocked dependencies
            );

            // Execute the asynchronous _initialize method to load configurations
            await loaderInstance._initialize();

            // --- Assertions for Primary Config Properties ---
            // Verify that the primary config path is correctly identified as the bundled config path
            expect(loaderInstance.primaryConfigPath).to.equal(mockDefaultMainConfigPath, 'primaryConfigPath should be the bundled config path');
            // Verify the reason for loading the primary config
            expect(loaderInstance.primaryConfigLoadReason).to.equal("bundled main", 'primaryConfigLoadReason should be "bundled main"');
            // Verify that the content of the primary config matches the mocked content that was loaded
            expect(loaderInstance.primaryConfig).to.deep.equal(mockDefaultMainConfigContent, 'primaryConfig should match the loaded bundled config content');

            // Verify that loadYamlConfig was called exactly once, and specifically with the primary config path
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).calledOnce).to.be.true;

            // --- Assertions for Secondary Config Contents ---
            // projectConfigContents should be an empty object as no CLI path was provided or existed
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            // xdgConfigContents should be an empty object as the XDG path did not exist
            expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');

            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
