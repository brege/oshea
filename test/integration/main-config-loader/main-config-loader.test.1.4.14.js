// test/integration/main-config-loader/main-config-loader.test.1.4.14.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.14)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for primary (XDG) and secondary (Project Manifest) configs
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockXdgConfigContent = { xdgPrimary: 'xdg primary config value', featureA: true };

    // The projectManifestConfigPath will be passed to the constructor and loaded as secondary
    const mockProjectManifestConfigPath = '/cli/secondary/config.yaml';
    const mockProjectManifestConfigContent = { projectManifestSecondary: 'project manifest secondary config value', featureB: false };

    // Other paths that will exist but are lower priority or not directly loaded into specific secondary properties
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
        // Set all relevant config files to exist.
        // XDG config exists (will be primary as CLI is passed but has lower priority than factory default,
        // which itself is less priority than XDG unless CLI is explicitly chosen or useFactoryDefaultsOnly is true)
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG config exists (will be primary)
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // Project Manifest also exists (will be secondary)
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled config also exists (lower priority)
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists


        // Set up loadYamlConfig for all paths that are expected to be loaded
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves(mockXdgConfigContent);
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it.skip('1.4.14 Test _initialize loads projectConfigContents from projectManifestConfigPath if it exists and is not the primary config.', async () => {
            // Instantiate MainConfigLoader with XDG config as primary, and Project Manifest as secondary.
            // mainConfigPathFromCli is provided, so it will be considered for projectConfigContents.
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // mainConfigPathFromCli: provided (will be secondary load target)
                false, // useFactoryDefaultsOnly: false
                mockXdgBaseDir, // xdgBaseDir: provided, ensuring XDG global config is determinable
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject mocked dependencies
            );

            // Execute the asynchronous _initialize method to load configurations
            await loaderInstance._initialize();

            // --- Assertions for Primary Config (XDG) ---
            // Verify that the XDG config was correctly identified and loaded as the primary config
            expect(loaderInstance.primaryConfigPath).to.equal(mockXdgGlobalConfigPath, 'primaryConfigPath should be the XDG path');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("XDG global", 'primaryConfigLoadReason should be "XDG global"');
            expect(loaderInstance.primaryConfig).to.deep.equal(mockXdgConfigContent, 'primaryConfig should match XDG content');
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;


            // --- Assertions for Project Manifest Secondary Config ---
            // Verify that projectConfigContents was loaded correctly from the projectManifestConfigPath
            expect(loaderInstance.projectConfigContents).to.deep.equal(mockProjectManifestConfigContent, 'projectConfigContents should contain loaded Project Manifest content');
            // Verify loadYamlConfig was called for the Project Manifest config path
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;
            // Crucially, verify that the Project Manifest config was loaded *after* the primary XDG config.
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledAfter(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath))).to.be.true;

            // Ensure that the Project Manifest config was indeed NOT the primary config in this scenario
            expect(loaderInstance.primaryConfigPath).to.not.equal(mockProjectManifestConfigPath);

            // --- Assertions for Other Config Contents ---
            // xdgConfigContents should be the same as primary because XDG was primary.
            expect(loaderInstance.xdgConfigContents).to.deep.equal(mockXdgConfigContent, 'xdgConfigContents should be loaded from XDG path');
            // Default bundled config should NOT be loaded into a specific secondary property, nor should its loadYamlConfig be called for secondary.
            expect(loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).called).to.be.false;
            // Factory default config should NOT be loaded into a specific secondary property.
            expect(loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).called).to.be.false;


            // Verify that the _initialized flag is set to true after successful initialization
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
