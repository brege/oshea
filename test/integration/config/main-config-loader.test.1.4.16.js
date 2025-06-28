// test/integration/config/main-config-loader.test.1.4.16.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/config/main_config_loader');

describe('MainConfigLoader (1.4.16)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for a successful primary load (e.g., bundled config)
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { setting: 'value', loaded: true };
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml'); // Always exists for determination


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure existsSync to ensure a successful primary load (bundled config in this case)
        fsMock.existsSync.returns(false); // Default for all paths initially
        fsMock.existsSync.withArgs(mockDefaultMainConfigPath).returns(true); // Bundled config exists (will be primary)
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true); // Factory default also exists


        // Configure loadYamlConfig for the expected primary load
        loadYamlConfigStub.withArgs(mockDefaultMainConfigPath).resolves(mockDefaultMainConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.16 Test _initialize correctly sets _initialized to true after completion.', async () => {
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli
                false, // useFactoryDefaultsOnly
                null, // xdgBaseDir
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Initially, _initialized should be false
            expect(loaderInstance._initialized).to.be.false;

            // Execute the _initialize method
            await loaderInstance._initialize();

            // After _initialize completes successfully, _initialized should be true
            expect(loaderInstance._initialized).to.be.true;

            // Optional extended check: Verify that calling _initialize again does not re-execute logic
            // due to the `if (this._initialized) return;` guard.
            loadYamlConfigStub.resetHistory(); // Reset the stub's call history
            await loaderInstance._initialize(); // Call _initialize again

            // loadYamlConfig should NOT have been called again, indicating the method returned early
            expect(loadYamlConfigStub.called).to.be.false;
        });
    });
});
