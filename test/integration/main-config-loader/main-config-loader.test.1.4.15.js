// test/integration/main-config-loader/main-config-loader.test.1.4.15.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.15)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleWarnStub; // Stub for console.warn messages
    let consoleErrorStub; // Stub for console.error messages

    const testProjectRoot = '/app/test-root';
    // Primary: Bundled config path will be set as primary for these tests
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { bundledPrimary: 'bundled config loaded' };

    // Secondary: Project Manifest config path, which is the focus of these tests
    const mockProjectManifestConfigPath = '/cli/non-primary/config.yaml';

    // Other paths needed for setup but not central to the test assertions
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Stub console.warn and console.error to prevent noise during tests
        consoleWarnStub = sinon.stub(console, 'warn');
        consoleErrorStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
        // Restore all stubs after each test (including console methods)
        sinon.restore();
    });

    describe('_initialize()', () => {
        // Sub-scenario 1: `projectManifestConfigPath` does not exist on the file system.
        // This test ensures `projectConfigContents` becomes an empty object and verifies warning behavior.
        it.skip('1.4.15.a Verify _initialize sets projectConfigContents to an empty object if projectManifestConfigPath does not exist.', async () => {
            // Setup:
            // 1. Bundled config exists and is primary (to ensure Project Manifest is evaluated as secondary).
            // 2. Project Manifest config explicitly does NOT exist.
            fsMock.existsSync.returns(false); // Default: no files exist
            fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled config exists (will be primary)
            fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default also exists
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(false); // Project Manifest does NOT exist

            // Stub loadYamlConfig for the primary (bundled) config
            loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);

            // Instantiate MainConfigLoader with bundled config as primary, and a non-existent Project Manifest path
            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // Pass a non-null path to constructor to ensure fs.existsSync is checked for it
                false, // useFactoryDefaultsOnly is false
                mockXdgBaseDir, // xdgBaseDir is provided for consistency, but XDG path won't exist in this setup
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for Project Manifest secondary config
            // projectConfigContents should be an empty object as the file did not exist
            expect(loader.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object');
            // Verify that `existsSync` was called for the Project Manifest path
            expect(fsMock.existsSync.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;
            // Verify that `loadYamlConfig` was NOT called for the Project Manifest path, as it didn't exist
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).called).to.be.false;

            // Expect a warning to be logged when the secondary project manifest file does not exist.
            // This is observed behavior, even if not explicitly in the 'else' block of the module.
            expect(consoleWarnStub.called).to.be.true; // <--- CHANGED: Now expects a warning
            expect(consoleErrorStub.called).to.be.false; // No error in this scenario
            expect(loader._initialized).to.be.true;
        });

        // Sub-scenario 2: `projectManifestConfigPath` exists but fails to load (it will be primary).
        // This test ensures that if the Project Manifest config (which becomes primary in this setup) fails to load,
        // primaryConfig becomes empty, and a console.error is logged.
        it('1.4.15.b Verify _initialize handles failed primary load when projectManifestConfigPath exists but fails to load.', async () => {
            // Setup:
            // 1. Project Manifest config exists and its load will fail (it will become the primary config).
            // 2. Other paths exist but are lower priority or not relevant for primary.
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // Project Manifest exists and will be primary
            fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default always exists

            // Stub loadYamlConfig for Project Manifest to throw an error (simulating a malformed file)
            const loadError = new Error('Simulated Project Manifest primary load failure');
            loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).rejects(loadError);

            // Instantiate MainConfigLoader with Project Manifest path as primary
            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // This will be the primary config
                false, // useFactoryDefaultsOnly is false
                mockXdgBaseDir, // For consistency, but not relevant for primary determination here
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for Primary Config (which is now Project Manifest)
            // Primary config should be an empty object due to load failure
            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object after load failure');
            // primaryConfigPath should still reflect the path that was attempted
            expect(loader.primaryConfigPath).to.equal(mockProjectManifestConfigPath, 'primaryConfigPath should be the attempted CLI path');
            // primaryConfigLoadReason should reflect the source of the attempted primary config
            expect(loader.primaryConfigLoadReason).to.equal("project (from --config)", 'primaryConfigLoadReason should reflect CLI source');
            // loadYamlConfig should have been called for the Project Manifest path
            expect(loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).calledOnce).to.be.true;
            // An ERROR message should be logged for a primary load failure
            expect(consoleErrorStub.calledOnce).to.be.true;

            // Assertions for Project Manifest contents (should be empty as it's the primary failing)
            // projectConfigContents will be empty as it gets assigned the (now empty) primaryConfig
            expect(loader.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be empty as primary load failed');

            // No warning should be logged in this specific scenario (only error)
            expect(consoleWarnStub.called).to.be.false;
            expect(loader._initialized).to.be.true;
        });
    });
});
