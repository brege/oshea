// test/config-resolver/config-resolver.test.1.1.3.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.3
describe('ConfigResolver _loadPluginBaseConfig (1.1.3)', () => {

    let mockDependencies;
    let resolver;

    beforeEach(async () => {
        // --- FIX: Create a more realistic mock instance for PluginConfigLoader ---
        const mockPluginConfigLoaderInstance = {
            _rawPluginYamlCache: {} // Ensure the cache property exists
        };
        const MockPluginConfigLoader = sinon.stub().returns(mockPluginConfigLoaderInstance);
        
        const mockRegistryBuilderInstance = { buildRegistry: sinon.stub().resolves({}) };
        const MockPluginRegistryBuilder = sinon.stub().returns(mockRegistryBuilderInstance);
        const mockMainConfigLoaderInstance = {
            getPrimaryMainConfig: sinon.stub().resolves({ config: {} }),
            getXdgMainConfig: sinon.stub().resolves({}),
            getProjectManifestConfig: sinon.stub().resolves({})
        };
        const MockMainConfigLoader = sinon.stub().returns(mockMainConfigLoaderInstance);

        mockDependencies = {
            fs: { existsSync: sinon.stub().returns(true) },
            loadYamlConfig: sinon.stub(), // Injecting the function directly now
            AssetResolver: {
                resolveAndMergeCss: sinon.stub()
            },
            PluginConfigLoader: MockPluginConfigLoader,
            PluginRegistryBuilder: MockPluginRegistryBuilder,
            MainConfigLoader: MockMainConfigLoader
        };

        resolver = new ConfigResolver(null, false, false, mockDependencies);
        await resolver._initializeResolverIfNeeded();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should load raw config, resolve CSS, and return a structured object', async () => {
        // Arrange
        const fakeConfigPath = '/fake/plugin/plugin.config.yaml';
        const fakeAssetsPath = '/fake/plugin';
        const fakePluginName = 'my-plugin';
        
        const rawConfigData = { css_files: ['style.css'], inherit_css: true };
        const resolvedCssPaths = ['/fake/plugin/style.css'];

        mockDependencies.loadYamlConfig.withArgs(fakeConfigPath).resolves(rawConfigData);
        mockDependencies.AssetResolver.resolveAndMergeCss.returns(resolvedCssPaths);
        
        // Act
        const result = await resolver._loadPluginBaseConfig(fakeConfigPath, fakeAssetsPath, fakePluginName);

        // Assert
        expect(mockDependencies.loadYamlConfig.calledWith(fakeConfigPath)).to.be.true;
        expect(mockDependencies.AssetResolver.resolveAndMergeCss.calledWith(
            rawConfigData.css_files, fakeAssetsPath, [], false, fakePluginName, fakeConfigPath
        )).to.be.true;

        expect(result).to.be.an('object');
        expect(result.rawConfig).to.deep.equal(rawConfigData);
        expect(result.resolvedCssPaths).to.deep.equal(resolvedCssPaths);
        expect(result.inherit_css).to.be.true;
        expect(result.actualPath).to.equal(fakeConfigPath);
    });
});
