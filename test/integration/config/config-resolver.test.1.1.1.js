// test/integration/config/config-resolver.test.1.1.1.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/config/ConfigResolver');

// Test suite for Scenario 1.1.1
describe('ConfigResolver _initializeResolverIfNeeded (1.1.1)', () => {

    let mockDependencies;
    let mockMainConfigLoaderInstance;

    beforeEach(() => {
        // Mock the return values for the main config loader's methods
        const primaryConfig = {
            config: { collections_root: '/fake/collections/root', some_other_key: 'value' },
            path: '/fake/path/to/main-config.yaml',
            reason: 'test'
        };
        const xdgConfig = { config: {}, path: null, baseDir: null };
        const projectConfig = { config: {}, path: null, baseDir: null };

        // Create a mock instance of MainConfigLoader with stubbed methods
        mockMainConfigLoaderInstance = {
            getPrimaryMainConfig: sinon.stub().resolves(primaryConfig),
            getXdgMainConfig: sinon.stub().resolves(xdgConfig),
            getProjectManifestConfig: sinon.stub().resolves(projectConfig)
        };
        
        // Mock the classes themselves, so we can control their instantiation
        const MockMainConfigLoader = sinon.stub().returns(mockMainConfigLoaderInstance);
        const MockPluginConfigLoader = sinon.stub();
        const MockPluginRegistryBuilder = sinon.stub().returns({
            buildRegistry: sinon.stub().resolves({})
        });

        mockDependencies = {
            MainConfigLoader: MockMainConfigLoader,
            PluginConfigLoader: MockPluginConfigLoader,
            PluginRegistryBuilder: MockPluginRegistryBuilder
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly load configurations and set internal properties', async () => {
        // Arrange
        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // Act
        await resolver._initializeResolverIfNeeded();

        // Assert
        // 1. Verify the main config loader was used to fetch configs
        expect(mockMainConfigLoaderInstance.getPrimaryMainConfig.called).to.be.true;
        expect(mockMainConfigLoaderInstance.getXdgMainConfig.called).to.be.true;
        expect(mockMainConfigLoaderInstance.getProjectManifestConfig.called).to.be.true;

        // 2. Verify the primary config properties were set correctly on the resolver instance
        expect(resolver.primaryMainConfig).to.deep.equal({ collections_root: '/fake/collections/root', some_other_key: 'value' });
        expect(resolver.primaryMainConfigPathActual).to.equal('/fake/path/to/main-config.yaml');
        
        // 3. Verify that the collections root path was correctly extracted
        expect(resolver.resolvedCollRoot).to.equal('/fake/collections/root');
        
        // 4. Verify that the helper classes for plugin loading were instantiated
        expect(mockDependencies.PluginConfigLoader.calledOnce).to.be.true;
        expect(mockDependencies.PluginRegistryBuilder.calledOnce).to.be.true;
    });
});
