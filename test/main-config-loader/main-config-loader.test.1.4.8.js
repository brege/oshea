// test/main-config-loader/main-config-loader.test.1.4.8.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../src/main_config_loader');

describe('MainConfigLoader (1.4.8)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml'); // This path should NOT exist in this test

    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { bundledSetting: 'bundled value', common: 'bundled primary common' };

    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');
    const mockFactoryDefaultConfigContent = { factorySetting: 'factory default value', common: 'factory common' };

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        // Set all paths to not exist by default.
        fsMock.existsSync.returns(false);
        // Explicitly set the bundled config path and factory default path to exist.
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled path exists
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists


        // Set up loadYamlConfig for the paths that will be loaded
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.8 Test _initialize correctly prioritizes defaultMainConfigPath (bundled) if it exists and no higher-priority config is found.', async () => {
            // Instantiate MainConfigLoader:
            // - mainConfigPathFromCli is null (so CLI config does not apply)
            // - useFactoryDefaultsOnly is false (so factory default is not forced as primary)
            // - xdgBaseDir is null (so XDG global config will not be found by default, ensuring bundled config is prioritized)
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli (CLI config)
                false, // useFactoryDefaultsOnly
                null, // xdgBaseDir (XDG global config)
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the _initialize method
            await loaderInstance._initialize();

            // --- Assertions for Primary Config Selection ---
            // Verify that the primary config path is correctly identified as the bundled config path
            expect(loaderInstance.primaryConfigPath).to.equal(mockDefaultMainConfigPath, 'primaryConfigPath should be the bundled path');
            // Verify the reason for loading the primary config
            expect(loaderInstance.primaryConfigLoadReason).to.equal("bundled main", 'primaryConfigLoadReason should be "bundled main"');
            // Verify the content of the primary config matches the mocked bundled content
            expect(loaderInstance.primaryConfig).to.deep.equal(mockDefaultMainConfigContent, 'primaryConfig should match content loaded from bundled path');

            // Verify that loadYamlConfig was called exactly once with the primary config path (bundled path)
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).calledOnce).to.be.true;

            // --- Crucial checks for Prioritization Order ---
            // Verify that loadYamlConfig for factory default config was NOT called *before* the bundled config load.
            // This ensures that the bundled config correctly took precedence for primary config selection.
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).calledBefore(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath))).to.be.false;


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
