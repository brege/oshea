// test/integration/config-resolver/config-resolver.test.1.1.2.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/ConfigResolver');

// Test suite for Scenario 1.1.2
describe('ConfigResolver _initializeResolverIfNeeded Registry Caching (1.1.2)', () => {

    let mockDependencies;
    let MockPluginRegistryBuilder;
    let mockMainConfigLoaderInstance;

    beforeEach(() => {
        // Create mock classes for the dependencies
        mockMainConfigLoaderInstance = {
            getPrimaryMainConfig: sinon.stub().resolves({ config: {}, path: '/fake/path', reason: 'initial' }),
            getXdgMainConfig: sinon.stub().resolves({}),
            getProjectManifestConfig: sinon.stub().resolves({})
        };
        const MockMainConfigLoader = sinon.stub().returns(mockMainConfigLoaderInstance);

        // We need to spy on the constructor of PluginRegistryBuilder to count calls
        MockPluginRegistryBuilder = sinon.stub().returns({
            buildRegistry: sinon.stub().resolves({
                // Return a mock registry object. The properties are set by ConfigResolver after build.
            })
        });

        mockDependencies = {
            MainConfigLoader: MockMainConfigLoader,
            PluginConfigLoader: sinon.stub(),
            PluginRegistryBuilder: MockPluginRegistryBuilder
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it.skip('should not rebuild the registry on a second call if conditions are unchanged', async () => {
        // Arrange
        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // Act
        await resolver._initializeResolverIfNeeded(); // First call
        await resolver._initializeResolverIfNeeded(); // Second call

        // Assert
        // The registry builder should only be called once.
        expect(MockPluginRegistryBuilder.callCount).to.equal(1);
    });

    it.skip('should rebuild the registry if useFactoryDefaultsOnly changes between calls', async () => {
        // Arrange
        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // Act
        await resolver._initializeResolverIfNeeded(); // First call, builds with useFactoryDefaultsOnly = false

        // Manually change the property on the instance to simulate a different run condition
        resolver.useFactoryDefaultsOnly = true;

        await resolver._initializeResolverIfNeeded(); // Second call

        // Assert
        // --- FIX: Corrected typo in variable name ---
        expect(MockPluginRegistryBuilder.callCount).to.equal(2);
    });
});
