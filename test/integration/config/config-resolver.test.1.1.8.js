// test/integration/config/config-resolver.test.1.1.8.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/config/ConfigResolver');

// Test suite for Scenario 1.1.8
describe('ConfigResolver getEffectiveConfig (1.1.8)', () => {

    it("should throw an error if a registered plugin's config file does not exist", async () => {
        // Arrange
        const FAKE_PLUGIN_NAME = 'my-registered-plugin';
        const FAKE_CONFIG_PATH = '/path/to/a/missing/config.yaml';

        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                dirname: sinon.stub().returns(''),
                sep: '/',
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: sinon.stub().returns(false),
                readFileSync: sinon.stub().returns('{}')
            }
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

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
