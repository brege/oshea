// test/integration/main-config-loader/main-config-loader.test.1.4.12.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.12)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for primary (CLI) and secondary (XDG) configs
    const mockProjectManifestConfigPath = '/cli/primary/config.yaml';
    const mockProjectManifestConfigContent = { cliPrimary: 'cli primary config value', setting1: true };

    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgSecondary: 'xdg secondary config value', setting2: false };

    // Other paths that will exist but are lower priority than CLI and XDG
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { bundled: 'bundled config value', setting3: 123 };

    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');
    const mockFactoryDefaultConfigContent = { factory: 'factory config value', setting4: 'abc' };

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        // Set all relevant config files to exist, ensuring prioritization is tested.
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // CLI config exists (will be primary)
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG config also exists (should be secondary)
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled config also exists (lower priority than XDG)
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists


        // Set up loadYamlConfig for all paths that are expected to be loaded
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.12 Test _initialize loads xdgConfigContents from xdgGlobalConfigPath if it exists and is not the primary config.', async () => {
            // Instantiate MainConfigLoader with CLI config provided as primary,
            // ensuring XDG config is loaded as a secondary source.
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // mainConfigPathFromCli: provided, will be the primary config
                false, // useFactoryDefaultsOnly: false, allowing prioritization
                mockXdgBaseDir, // xdgBaseDir: provided, allowing xdgGlobalConfigPath to be determined
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject mocked dependencies
            );

            // Execute the asynchronous _initialize method to load configurations
            await loaderInstance._initialize();

            // --- Assertions for Primary Config ---
            // Verify that the CLI config was correctly identified and loaded as the primary config
            expect(loaderInstance.primaryConfigPath).to.equal(mockProjectManifestConfigPath, 'primaryConfigPath should be the CLI path');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("project (from --config)", 'primaryConfigLoadReason should be "project (from --config)"');
            expect(loaderInstance.primaryConfig).to.deep.equal(mockProjectManifestConfigContent, 'primaryConfig should match CLI content');
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;


            // --- Assertions for XDG Secondary Config ---
            // Verify that xdgConfigContents was loaded correctly from the XDG global config path
            expect(loaderInstance.xdgConfigContents).to.deep.equal(mockXdgConfigContent, 'xdgConfigContents should contain loaded XDG content');
            // Verify loadYamlConfig was called for the XDG config path
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;
            // Crucially, verify that the XDG config was loaded *after* the primary CLI config.
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledAfter(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath))).to.be.true;

            // Ensure that the XDG config was indeed NOT the primary config in this scenario
            expect(loaderInstance.primaryConfigPath).to.not.equal(mockXdgGlobalConfigPath);

            // --- Assertions for Other Config Contents ---
            // projectConfigContents should be the same as primary because the CLI path was primary.
            expect(loaderInstance.projectConfigContents).to.deep.equal(mockProjectManifestConfigContent, 'projectConfigContents should be loaded from the CLI path (primary)');
            // Default bundled config should NOT be loaded into a specific secondary property, nor should its loadYamlConfig be called for secondary.
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).called).to.be.false;
            // Factory default config should NOT be loaded into a specific secondary property.
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).called).to.be.false;


            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
