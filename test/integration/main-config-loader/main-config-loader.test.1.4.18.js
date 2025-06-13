// test/integration/main-config-loader/main-config-loader.test.1.4.18.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.18)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for primary (CLI) and XDG (secondary) configs
    // Primary config (CLI) to ensure XDG is loaded as a secondary config
    const mockProjectManifestConfigPath = '/cli/primary/config.yaml';
    const mockProjectManifestConfigContent = { cliSetting: 'cli value', data: 123 };

    // XDG config (expected to be loaded by getXdgMainConfig)
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgSetting: 'xdg value', data: 456 };

    // Other paths for comprehensive stubbing
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // CLI config exists (will be primary)
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG config exists (will be loaded as secondary)
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled config also exists
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists

        // Configure loadYamlConfig for expected loads
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        // Stub for other paths as well, though not directly asserted for content in this test
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves({});
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves({});
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('getXdgMainConfig()', () => {
        it('1.4.18 Test getXdgMainConfig returns the XDG global configuration object, including the added projectRoot property, along with its path and base directory.', async () => {
            // Instantiate MainConfigLoader with CLI path as primary to ensure XDG is loaded as secondary
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // Set CLI path as primary
                false, // useFactoryDefaultsOnly
                mockXdgBaseDir, // Provide xdgBaseDir for XDG path calculation
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Call getXdgMainConfig, which implicitly calls _initialize()
            const xdgConfigResult = await loaderInstance.getXdgMainConfig();

            // --- Assertions for the returned object structure ---
            expect(xdgConfigResult).to.be.an('object', 'The returned result should be an object');
            // Corrected: Removed the custom message from have.all.keys to resolve the type error.
            expect(xdgConfigResult).to.have.all.keys(['config', 'path', 'baseDir']);

            // --- Assertions for the 'config' object ---
            // It should be a deep copy of the mocked XDG content plus the projectRoot
            expect(xdgConfigResult.config).to.deep.equal({
                ...mockXdgConfigContent,
                projectRoot: testProjectRoot // Verify that projectRoot is correctly added to the config object
            }, 'The config object should contain the loaded XDG content and the projectRoot');

            // --- Assertions for 'path' ---
            // Verify that the path property matches the expected XDG global config path
            expect(xdgConfigResult.path).to.equal(mockXdgGlobalConfigPath, 'The path property should match the XDG global config path');

            // --- Assertions for 'baseDir' ---
            // Verify that baseDir is correctly derived from the XDG global config path
            expect(xdgConfigResult.baseDir).to.equal(path.dirname(mockXdgGlobalConfigPath), 'The baseDir should be the directory of the XDG global config path');

            // Verify that _initialize was called and completed successfully
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
