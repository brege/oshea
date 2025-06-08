// test/main-config-loader/main-config-loader.test.1.4.7.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../src/main_config_loader');

describe('MainConfigLoader (1.4.7)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgSetting: 'xdg value', common: 'xdg primary common' };

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

        // Configure existsSync:
        // Ensure only the XDG, bundled, and factory default paths exist.
        // The CLI config path (passed as null) should not be checked for existence in the primary determination logic.
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG path exists
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled path exists
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists


        // Set up loadYamlConfig for the paths that will be loaded
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.7 Verify _initialize correctly prioritizes xdgGlobalConfigPath if it exists and neither CLI config nor useFactoryDefaultsOnly applies.', async () => {
            // Instantiate MainConfigLoader with CLI path as null (so it doesn't apply),
            // and useFactoryDefaultsOnly set to false.
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli is null, effectively making CLI config not apply
                false, // useFactoryDefaultsOnly is false, allowing XDG priority
                mockXdgBaseDir, // xdgBaseDir is provided for consistent path calculation
                { fs: fsMock, path: path, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the _initialize method
            await loaderInstance._initialize();

            // --- Assertions for Primary Config Selection ---
            // Verify that the primary config path is correctly identified as the XDG global path
            expect(loaderInstance.primaryConfigPath).to.equal(mockXdgGlobalConfigPath, 'primaryConfigPath should be the XDG global path');
            // Verify the reason for loading the primary config
            expect(loaderInstance.primaryConfigLoadReason).to.equal("XDG global", 'primaryConfigLoadReason should be "XDG global"');
            // Verify the content of the primary config matches the mocked XDG content
            expect(loaderInstance.primaryConfig).to.deep.equal(mockXdgConfigContent, 'primaryConfig should match content loaded from XDG path');

            // Verify that loadYamlConfig was called exactly once with the primary config path (XDG path)
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;

            // --- Crucial checks for Prioritization Order ---
            // Verify that loadYamlConfig for default bundled config was NOT called *before* the XDG config load.
            // This ensures XDG correctly took precedence for primary config selection.
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath))).to.be.false;
            // Verify that loadYamlConfig for factory default config was NOT called *before* the XDG config load.
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath))).to.be.false;


            // --- Assertions for Secondary Config Contents ---
            // projectConfigContents should be an empty object as no CLI path was provided
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            // xdgConfigContents should be the same as the primary config as the XDG path was primary
            expect(loaderInstance.xdgConfigContents).to.deep.equal(mockXdgConfigContent, 'xdgConfigContents should be loaded from XDG path');


            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
