// test/integration/main-config-loader/main-config-loader.test.1.4.5.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.5)', () => {
    let fsMock;
    let loadYamlConfigStub;
    const testProjectRoot = '/app/test-root';
    let loaderInstance;

    // Define expected paths and content
    const mockFactoryDefaultConfigPath = path.join(testProjectRoot, 'config.example.yaml');
    const mockFactoryDefaultConfigContent = { defaultSetting: 'factory default value', plugins: { example: true } };

    const mockDefaultMainConfigPath = path.join(testProjectRoot, 'config.yaml');
    const mockXdgBaseDir = '/home/testuser/.config/md-to-pdf';
    const mockXdgGlobalConfigPath = path.join(mockXdgBaseDir, 'config.yaml');
    const mockProjectManifestConfigPath = '/some/cli/path/cli-config.yaml';


    beforeEach(() => {
        // Create stubs for fs and loadYamlConfig
        fsMock = {
            existsSync: sinon.stub()
        };
        loadYamlConfigStub = sinon.stub();

        // Configure default behavior for existsSync:
        // By default, make all paths not exist to ensure our specific test case dominates,
        // then explicitly set factoryDefaultMainConfigPath to exist.
        fsMock.existsSync.returns(false);
        fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).returns(true);


        // Configure loadYamlConfig stub to return content for the factory default path
        loadYamlConfigStub.withArgs(mockFactoryDefaultConfigPath).resolves(mockFactoryDefaultConfigContent);
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('_initialize()', () => {
        it('1.4.5 Verify _initialize correctly selects factoryDefaultMainConfigPath as primary when useFactoryDefaultsOnly is true.', async () => {
            // Instantiate MainConfigLoader with useFactoryDefaultsOnly set to true
            // Inject mocked dependencies
            loaderInstance = new MainConfigLoader(
                testProjectRoot,
                mockProjectManifestConfigPath, // Provide a non-null value for projectManifestConfigPath to ensure it's bypassed
                true, // useFactoryDefaultsOnly
                mockXdgBaseDir, // Provide a non-null xdgBaseDir for consistency
                { fs: fsMock, path: path, loadYamlConfig: loadYamlConfigStub }
            );

            // Execute the _initialize method
            await loaderInstance._initialize();

            // Assertions for primary config selection
            expect(loaderInstance.primaryConfigPath).to.equal(mockFactoryDefaultConfigPath, 'primaryConfigPath should be factory default');
            expect(loaderInstance.primaryConfigLoadReason).to.equal("factory default", 'primaryConfigLoadReason should be "factory default"');
            expect(loaderInstance.primaryConfig).to.deep.equal(mockFactoryDefaultConfigContent, 'primaryConfig should match mocked factory default content');
            expect(loadYamlConfigStub.calledOnceWith(mockFactoryDefaultConfigPath)).to.be.true;

            // Verify that fs.existsSync was called for factoryDefaultMainConfigPath
            expect(fsMock.existsSync.withArgs(mockFactoryDefaultConfigPath).calledOnce).to.be.true;

            // Verify that existsSync calls for higher-priority paths were not made for primary config selection
            // because useFactoryDefaultsOnly is true.
            expect(fsMock.existsSync.withArgs(loaderInstance.projectManifestConfigPath).called).to.be.false;
            expect(fsMock.existsSync.withArgs(loaderInstance.xdgGlobalConfigPath).called).to.be.false;
            expect(fsMock.existsSync.withArgs(loaderInstance.defaultMainConfigPath).called).to.be.false;


            // Assertions for xdgConfigContents and projectConfigContents when useFactoryDefaultsOnly is true
            // These should be empty/null as per the module's logic in this scenario
            expect(loaderInstance.xdgConfigContents).to.deep.equal({}, 'xdgConfigContents should be an empty object');
            expect(loaderInstance.projectConfigContents).to.deep.equal({}, 'projectConfigContents should be an empty object'); // It defaults to null then gets coerced to {}

            // Verify that _initialized flag is set to true
            expect(loaderInstance._initialized).to.be.true;
        });
    });
});
