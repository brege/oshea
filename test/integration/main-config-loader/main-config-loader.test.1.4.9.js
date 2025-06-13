// test/integration/main-config-loader/main-config-loader.test.1.4.9.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.9)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for the fallback factory default
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');
    const mockFactoryDefaultConfigContent = { factorySetting: 'fallback factory default value', common: 'fallback common' };

    // Paths for higher-priority configs that should NOT exist in this test
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        // Set all paths to return false by default, except the factory default path.
        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Only factory default exists for primary selection


        // Set up loadYamlConfig for the factory default path, as it's the only one expected to be loaded as primary
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.9 Verify _initialize falls back to factoryDefaultMainConfigPath if no other primary main configuration file is found.', async () => {
            // Instantiate MainConfigLoader with configurations that ensure no higher-priority files are found:
            // - mainConfigPathFromCli is null (CLI config does not apply)
            // - useFactoryDefaultsOnly is false (factory default is not forced as primary initially)
            // - xdgBaseDir is null (ensuring XDG global config path is not found)
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli (CLI config)
                false, // useFactoryDefaultsOnly
                null, // xdgBaseDir (XDG global config)
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loaderInstance._initialize();

            // --- Assertions for Primary Config Selection ---
            // Verify that the primary config path is correctly identified as the factory default fallback path
            expect(loaderInstance.primaryConfigPath).to.equal(mockFactoryDefaultConfigPath, 'primaryConfigPath should be the factory default fallback path');
            // Verify the reason for loading the primary config
            expect(loaderInstance.primaryConfigLoadReason).to.equal("factory default fallback", 'primaryConfigLoadReason should be "factory default fallback"');
            // Verify the content of the primary config matches the mocked factory default content
            expect(loaderInstance.primaryConfig).to.deep.equal(mockFactoryDefaultConfigContent, 'primaryConfig should match content loaded from factory default path');

            // Verify that loadYamlConfig was called exactly once with the factory default path, as it's the only primary one loaded
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).calledOnce).to.be.true;

            // --- Assertions for Secondary Config Contents ---
            // projectConfigContents should be an empty object because no CLI path was provided or existed
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            // xdgConfigContents should be an empty object because the XDG path did not exist
            expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');


            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
