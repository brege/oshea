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
            PluginRegistryBuilder: MockPluginRegistryBuilder,
            fs: { existsSync: sinon.stub().returns(true), readFileSync: sinon.stub().returns('{}') }, // For schema loading
            path: {
                resolve: sinon.stub().returnsArg(0),
                join: (...args) => args.join('/'),
                dirname: sinon.stub().returns('/fake/dir')
            },
            os: { homedir: sinon.stub().returns('/fake/home') },
            loadYamlConfig: sinon.stub().resolves({}),
            deepMerge: (a, b) => ({...a, ...b}),
            Ajv: sinon.stub().returns({ addSchema: sinon.stub(), getSchema: sinon.stub().returns({ schema: {} }), compile: sinon.stub().returns(() => true) }),
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    // REMOVED .skip()
    it('should not rebuild the registry on a second call if conditions are unchanged', async () => {
        // Arrange
        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 1: First call to _initializeResolverIfNeeded');
        // END AGGRESSIVE DEBUGGING
        await resolver._initializeResolverIfNeeded(); // First call

        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 1: Second call to _initializeResolverIfNeeded (conditions unchanged)');
        // END AGGRESSIVE DEBUGGING
        await resolver._initializeResolverIfNeeded(); // Second call

        // Assert
        // The registry builder should only be called once.
        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 1: MockPluginRegistryBuilder.callCount', MockPluginRegistryBuilder.callCount);
        // END AGGRESSIVE DEBUGGING
        expect(MockPluginRegistryBuilder.callCount).to.equal(1);
    });

    // REMOVED .skip()
    it('should rebuild the registry if useFactoryDefaultsOnly changes between calls', async () => {
        // Arrange
        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 2: First call to _initializeResolverIfNeeded (useFactoryDefaultsOnly = false)');
        // END AGGRESSIVE DEBUGGING
        await resolver._initializeResolverIfNeeded(); // First call, builds with useFactoryDefaultsOnly = false

        // Manually change the property on the instance to simulate a different run condition
        resolver.useFactoryDefaultsOnly = true;

        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 2: Second call to _initializeResolverIfNeeded (useFactoryDefaultsOnly = true)');
        // END AGGRESSIVE DEBUGGING
        await resolver._initializeResolverIfNeeded(); // Second call

        // Assert
        // The registry builder should be called twice.
        // AGGRESSIVE DEBUGGING
        console.log('DEBUG 1.1.2 Test 2: MockPluginRegistryBuilder.callCount', MockPluginRegistryBuilder.callCount);
        // END AGGRESSIVE DEBUGGING
        expect(MockPluginRegistryBuilder.callCount).to.equal(2);
    });
});
