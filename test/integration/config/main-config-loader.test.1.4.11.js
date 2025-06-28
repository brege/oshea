// test/integration/main-config-loader/main-config-loader.test.1.4.11.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.11)', () => {
    let fsMock;
    let loadYamlConfigStub;
    let consoleErrorStub;
    let consoleWarnStub; // To suppress console warnings from the module
    const testProjectRoot = '/app/test-root';

    // Define relevant paths
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml'); // The ultimate fallback path

    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Stub console.error and console.warn to prevent test output clutter
        consoleErrorStub = sinon.stub(console, 'error');
        consoleWarnStub = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        // Restore all stubs after each test (including console methods)
        sinon.restore();
    });

    describe('_initialize()', () => {
        // Sub-scenario 1: The determined primary configPathToLoad does not exist on the file system.
        // This simulates a scenario where no valid config files (CLI, XDG, bundled, factory default) are found.
        it('1.4.11.a Verify _initialize sets primaryConfig to an empty object if the determined configPathToLoad does not exist.', async () => {
            // Configure existsSync to return false for all paths.
            // This will cause MainConfigLoader to cycle through all primary config determination checks
            // and eventually pick `factoryDefaultMainConfigPath` as `configPathToLoad`.
            // However, since `fs.existsSync(factoryDefaultMainConfigPath)` will also return `false`,
            // it will result in `primaryConfig` being set to `{}`, `primaryConfigPath` to `null`,
            // and `primaryConfigLoadReason` to "none found".
            fsMock.existsSync.returns(false);

            // Instantiate MainConfigLoader with default parameters that allow the fallback logic to run its course
            const loader = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli
                false, // useFactoryDefaultsOnly
                null, // xdgBaseDir
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for primary config properties
            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object');
            expect(loader.primaryConfigPath).to.be.null; // Path should be null if no file was truly found
            expect(loader.primaryConfigLoadReason).to.equal("none found", 'primaryConfigLoadReason should be "none found"');
            expect(loadYamlConfigStub.called).to.be.false; // No config file should be attempted to be loaded
            expect(consoleWarnStub.calledOnce).to.be.true; // Expect a warning message for not finding a primary config
            expect(loader._initialized).to.be.true;
        });

        // Sub-scenario 2: The determined primary configPathToLoad exists, but loadYamlConfig fails (e.g., malformed content).
        it('1.4.11.b Verify _initialize sets primaryConfig to an empty object if the determined configPathToLoad exists but fails to load.', async () => {
            // Configure existsSync:
            // Set `mockDefaultMainConfigPath` to exist (so it's chosen as primary), and others to not exist for simplicity.
            fsMock.existsSync.returns(false);
            fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true);
            fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Always exists for fallback determination logic

            // Configure loadYamlConfig to throw an error when called for `mockDefaultMainConfigPath`
            const loadError = new Error('Simulated Malformed YAML error');
            loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).rejects(loadError);

            // Instantiate MainConfigLoader to ensure `mockDefaultMainConfigPath` is selected as primary
            const loader = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli
                false, // useFactoryDefaultsOnly
                null, // xdgBaseDir
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Execute the asynchronous _initialize method
            await loader._initialize();

            // Assertions for primary config properties
            expect(loader.primaryConfig).to.deep.equal({}, 'primaryConfig should be an empty object despite load failure');
            expect(loader.primaryConfigPath).to.equal(mockDefaultMainConfigPath, 'primaryConfigPath should still be the path that was attempted');
            expect(loader.primaryConfigLoadReason).to.equal("bundled main", 'primaryConfigLoadReason should reflect the attempted primary path');
            expect(loadYamlConfigStub.calledOnceWith(mockDefaultMainConfigPath)).to.be.true; // loadYamlConfig should have been called
            expect(consoleErrorStub.calledOnce).to.be.true; // Expect an error message for the failed load
            expect(loader._initialized).to.be.true;
        });
    });
});
