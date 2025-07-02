// test/integration/config/main-config-loader.test.1.4.13.js
const { mainConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.13)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleWarnStub; // To suppress console warnings during tests

    const testProjectRoot = '/app/test-root';
    // Define a higher-priority primary config that will load successfully
    const mockProjectManifestConfigPath = '/cli/primary/config.yaml';
    const mockProjectManifestConfigContent = { cliPrimary: 'cli primary config', setting1: true };

    // Define XDG paths
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();
        // Stub console.warn to suppress output, as the module logs warnings on load failures/non-existent files
        consoleWarnStub = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        // Restore all stubs after each test (including console.warn)
        sinon.restore();
    });

    describe('_initialize()', () => {
        // Sub-scenario 1: `xdgGlobalConfigPath` does not exist on the file system.
        it('1.4.13.a Verify _initialize sets xdgConfigContents to an empty object if xdgGlobalConfigPath does not exist.', async () => {
            // Setup:
            // 1. CLI config exists and is primary (to ensure XDG is evaluated as secondary).
            // 2. XDG config explicitly does NOT exist.
            fsMock.existsSync.returns(false); // Default for all paths
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true); // CLI config exists
            fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(false); // XDG config does NOT exist

            // Stub loadYamlConfig for the primary config
            loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);

            // Instantiate MainConfigLoader with CLI config as primary
            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath,
                false, // useFactoryDefaultsOnly is false
                mockXdgBaseDir, // xdgBaseDir is provided
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for XDG secondary config
            // xdgConfigContents should be an empty object as the file did not exist
            expect(loader.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
            // Verify that `existsSync` was called for the XDG path to check its existence
            expect(fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;
            // Verify that `loadYamlConfig` was NOT called for the XDG path, as it didn't exist
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).called).to.be.false;
            // No warning should be logged if the file simply doesn't exist and isn't loaded
            expect(consoleWarnStub.called).to.be.false;
            expect(loader._initialized).to.be.true;
        });

        // Sub-scenario 2: `xdgGlobalConfigPath` exists but fails to load (e.g., malformed YAML).
        it('1.4.13.b Verify _initialize sets xdgConfigContents to an empty object if xdgGlobalConfigPath exists but fails to load.', async () => {
            // Setup:
            // 1. CLI config exists and is primary.
            // 2. XDG config exists, but `loadYamlConfig` will throw an error for it.
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(mockProjectManifestConfigPath).returns(true);
            fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).returns(true); // XDG config exists

            // Stub loadYamlConfig for the primary config
            loadYamlConfigStub.withArgs(mockProjectManifestConfigPath).resolves(mockProjectManifestConfigContent);
            // Stub loadYamlConfig for XDG to throw an error
            const loadError = new Error('Simulated XDG config load failure (e.g., malformed YAML)');
            loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).rejects(loadError);

            // Instantiate MainConfigLoader with CLI config as primary
            const loader = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath,
                false, // useFactoryDefaultsOnly is false
                mockXdgBaseDir, // xdgBaseDir is provided
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for XDG secondary config
            // xdgConfigContents should be an empty object because loading failed
            expect(loader.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object despite the load attempt');
            // Verify that `existsSync` was called for the XDG path
            expect(fsMock.existsSync.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;
            // Verify that `loadYamlConfig` was called for the XDG path, as the file existed
            expect(loadYamlConfigStub.withArgs(mockXdgGlobalConfigPath).calledOnce).to.be.true;
            // A warning message should be logged for the failed XDG load
            expect(consoleWarnStub.calledOnce).to.be.true;
            expect(loader._initialized).to.be.true;
        });
    });
});
