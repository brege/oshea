// test/integration/config/config-resolver.test.1.1.14.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/config/ConfigResolver');

// Test suite for Scenario 1.1.14
describe('ConfigResolver getEffectiveConfig (1.1.14)', () => {

    it('should throw an error if the resolved handler_script path does not exist', async () => {
        // Arrange
        const FAKE_HANDLER_SCRIPT_NAME = 'my-handler.js';
        const FAKE_PLUGIN_CONFIG_PATH = '/fake/plugin-dir/plugin.config.yaml';
        const FAKE_BASE_PATH = '/fake/plugin-dir';
        const FAKE_RESOLVED_HANDLER_PATH = '/fake/plugin-dir/my-handler.js';

        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(FAKE_PLUGIN_CONFIG_PATH).returns(true);
        existsSyncStub.withArgs(FAKE_RESOLVED_HANDLER_PATH).returns(false);

        const mockDependencies = {
            path: {
                resolve: sinon.stub().returns(FAKE_RESOLVED_HANDLER_PATH),
                dirname: sinon.stub().returns(FAKE_BASE_PATH),
                sep: '/',
                basename: sinon.stub().returns(''),
                extname: sinon.stub().returns(''),
                // FIX: Added path.join
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: existsSyncStub,
                // FIX: Added fs.readFileSync
                readFileSync: sinon.stub().returns('{}')
            },
            deepMerge: (a, b) => ({ ...a, ...b })
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();
        resolver.primaryMainConfig = { global_pdf_options: {}, math: {} };
        resolver.mergedPluginRegistry = { 'my-plugin': { configPath: FAKE_PLUGIN_CONFIG_PATH } };

        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: { handler_script: FAKE_HANDLER_SCRIPT_NAME },
                mergedCssPaths: []
            })
        };
        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: FAKE_HANDLER_SCRIPT_NAME },
            resolvedCssPaths: [],
        });
        
        // Act & Assert
        try {
            await resolver.getEffectiveConfig('my-plugin');
            expect.fail('Expected getEffectiveConfig to throw an error, but it did not.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(`Handler script '${FAKE_RESOLVED_HANDLER_PATH}' not found for plugin 'my-plugin'.`);
        }
    });

    afterEach(() => {
        sinon.restore();
    });
});
