// test/integration/main-config-loader/main-config-loader.test.1.4.17.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.17)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define paths and mock content for a successful primary load (using bundled config as an example)
    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockDefaultMainConfigContent = { setting: 'value', modules: { active: true }, plugins: { basic: 'enabled' } };
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml'); // Necessary for path determination logic


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

    describe('getPrimaryMainConfig()', () => {
        it('1.4.17 Verify getPrimaryMainConfig returns the primary configuration object, including the added projectRoot property, along with its path, base directory, and load reason.', async () => {
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                null, // mainConfigPathFromCli: not provided
                false, // useFactoryDefaultsOnly: false
                null, // xdgBaseDir: not provided
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub } // Inject dependencies
            );

            // Call getPrimaryMainConfig. This method will implicitly call _initialize() if it hasn't been called yet.
            const primaryConfigResult = await loaderInstance.getPrimaryMainConfig();

            // --- Assertions for the returned object structure ---
            expect(primaryConfigResult).to.be.an('object', 'The returned result should be an object');
            // Corrected: Removed the custom message from have.all.keys to resolve the type error.
            expect(primaryConfigResult).to.have.all.keys(['config', 'path', 'baseDir', 'reason']);

            // --- Assertions for the 'config' object ---
            // It should be a deep copy of the mocked content plus the projectRoot
            expect(primaryConfigResult.config).to.deep.equal({
                ...mockDefaultMainConfigContent,
                projectRoot: testProjectRoot // Verify that projectRoot is correctly added to the config object
            }, 'The config object should contain the loaded content and the projectRoot');

            // --- Assertions for 'path' ---
            // Verify that the path property matches the expected primary config path
            expect(primaryConfigResult.path).to.equal(mockDefaultMainConfigPath, 'The path property should match the primary config path');

            // --- Assertions for 'baseDir' ---
            // Verify that baseDir is correctly derived from the primary config path
            expect(primaryConfigResult.baseDir).to.equal(path.dirname(mockDefaultMainConfigPath), 'The baseDir should be the directory of the primary config path');

            // --- Assertions for 'reason' ---
            // Verify that the reason property matches the expected load reason
            expect(primaryConfigResult.reason).to.equal("bundled main", 'The reason property should indicate "bundled main"');

            // Verify that _initialize was indeed called and completed successfully
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
