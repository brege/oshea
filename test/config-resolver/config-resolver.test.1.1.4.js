// test/config-resolver/config-resolver.test.1.1.4.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.4
describe('ConfigResolver getEffectiveConfig (1.1.4)', () => {

    let resolver;
    let loadBaseConfigStub;

    const FAKE_PLUGIN_NAME = 'my-registered-plugin';
    const FAKE_CONFIG_PATH = '/fake/plugins/my-plugin/my-plugin.config.yaml';
    const FAKE_BASE_PATH = '/fake/plugins/my-plugin';

    beforeEach(() => {
        const mockDependencies = {
            path: {
                dirname: sinon.stub().returns(FAKE_BASE_PATH),
                resolve: sinon.stub().returnsArg(0),
                basename: sinon.stub().returns(''),
                extname: sinon.stub().returns('')
            },
            fs: {
                existsSync: sinon.stub().returns(true)
            },
            deepMerge: (a, b) => ({...a, ...b}) // Simple merge for this test
        };

        resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        resolver.mergedPluginRegistry = {
            [FAKE_PLUGIN_NAME]: {
                configPath: FAKE_CONFIG_PATH
            }
        };

        // --- FIX: Manually set the properties that _initializeResolverIfNeeded would have created ---
        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: { handler_script: 'index.js' },
                mergedCssPaths: []
            })
        };
        resolver.primaryMainConfig = {
            global_pdf_options: {},
            math: {}
        };
        
        loadBaseConfigStub = sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js' },
            resolvedCssPaths: [],
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should resolve plugin paths from the mergedPluginRegistry for a registered plugin name', async () => {
        // Act
        await resolver.getEffectiveConfig(FAKE_PLUGIN_NAME);

        // Assert
        expect(resolver._initializeResolverIfNeeded.calledOnce).to.be.true;
        
        expect(loadBaseConfigStub.calledOnce).to.be.true;
        const callArgs = loadBaseConfigStub.firstCall.args;
        const pluginOwnConfigPath = callArgs[0];
        const actualPluginBasePath = callArgs[1];

        expect(pluginOwnConfigPath).to.equal(FAKE_CONFIG_PATH);
        expect(actualPluginBasePath).to.equal(FAKE_BASE_PATH);
    });
});
