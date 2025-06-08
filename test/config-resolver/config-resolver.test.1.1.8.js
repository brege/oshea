// test/config-resolver/config-resolver.test.1.1.8.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.8
describe('ConfigResolver getEffectiveConfig (1.1.8)', () => {

    it("should throw an error if a registered plugin's config file does not exist", async () => {
        // Arrange
        const FAKE_PLUGIN_NAME = 'my-registered-plugin';
        const FAKE_CONFIG_PATH = '/path/to/a/missing/config.yaml';

        // --- FIX: Provide a complete mock for the 'path' dependency ---
        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0), // Needed by constructor
                dirname: sinon.stub().returns(''),     // Needed by getEffectiveConfig
                sep: '/'                               // Needed by getEffectiveConfig
            },
            fs: {
                // Key for this test: The config file does NOT exist on the filesystem
                existsSync: sinon.stub().returns(false)
            }
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        // Stub the initializer and manually set the registry
        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();
        resolver.mergedPluginRegistry = {
            [FAKE_PLUGIN_NAME]: {
                configPath: FAKE_CONFIG_PATH
            }
        };
        
        const loadBaseConfigStub = sinon.stub(resolver, '_loadPluginBaseConfig');

        // Act & Assert
        try {
            await resolver.getEffectiveConfig(FAKE_PLUGIN_NAME);
            expect.fail('Expected getEffectiveConfig to throw an error, but it did not.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.contain(`not found at registered path: '${FAKE_CONFIG_PATH}'`);
        }
        
        expect(loadBaseConfigStub.called).to.be.false;
    });
});
