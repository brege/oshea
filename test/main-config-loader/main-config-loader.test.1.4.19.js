// test/main-config-loader/main-config-loader.test.1.4.19.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../src/main_config_loader');

describe('MainConfigLoader (1.4.19)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for Project Manifest to be the primary config in this test
    const mockProjectManifestConfigPath = '/cli/primary/config.yaml';
    const mockProjectManifestConfigContent = { cliManifestSetting: 'cli manifest value', version: '1.0', modules: { cli: true } };

    // Other paths needed for setup but not primary
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync:
        // Set Project Manifest config to exist, making it primary.
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // Project Manifest exists (will be primary)
        // Set other paths to exist for completeness, even if not primary
        fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true);
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true);


        // Configure loadYamlConfig for the expected primary load
        loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
        // Stub for other paths as well, though not directly asserted for content in this test
        loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).resolves({});
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves({});
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves({});
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('getProjectManifestConfig()', () => {
        it('1.4.19 Verify getProjectManifestConfig returns the project manifest configuration object, including the added projectRoot property, along with its path and base directory.', async () => {
            // Instantiate MainConfigLoader with Project Manifest path set as primary.
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // Set Project Manifest path as the primary config
                false, // useFactoryDefaultsOnly: false
                null, // xdgBaseDir: not provided, simplifying prioritization
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Call getProjectManifestConfig, which implicitly calls _initialize()
            const projectManifestConfigResult = await loaderInstance.getProjectManifestConfig();

            // --- Assertions for the returned object structure ---
            expect(projectManifestConfigResult).to.be.an('object', 'The returned result should be an object');
            // Corrected: Removed the custom message from have.all.keys to resolve the type error.
            expect(projectManifestConfigResult).to.have.all.keys(['config', 'path', 'baseDir']);

            // --- Assertions for the 'config' object ---
            // It should be a deep copy of the mocked Project Manifest content plus the projectRoot
            expect(projectManifestConfigResult.config).to.deep.equal({
                ...mockProjectManifestConfigContent,
                projectRoot: testProjectRoot // Verify that projectRoot is correctly added to the config object
            }, 'The config object should contain the loaded Project Manifest content and the projectRoot');

            // --- Assertions for 'path' ---
            // Verify that the path property matches the expected Project Manifest config path
            expect(projectManifestConfigResult.path).to.equal(mockProjectManifestConfigPath, 'The path property should match the Project Manifest config path');

            // --- Assertions for 'baseDir' ---
            // Verify that baseDir is correctly derived from the Project Manifest config path
            expect(projectManifestConfigResult.baseDir).to.equal(path.dirname(mockProjectManifestConfigPath), 'The baseDir should be the directory of the Project Manifest config path');

            // Verify that _initialize was called and completed successfully
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
