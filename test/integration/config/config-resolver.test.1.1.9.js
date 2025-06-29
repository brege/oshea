// test/integration/config/config-resolver.test.1.1.9.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/config/ConfigResolver');

// Test suite for Scenario 1.1.9
describe('ConfigResolver getEffectiveConfig (1.1.9)', () => {

    it('should apply XDG, Local, and Project overrides via pluginConfigLoader', async () => {
        // Arrange
        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                dirname: sinon.stub().returns('/fake/plugin/base/path'),
                sep: '/',
                basename: sinon.stub().returns(''),
                extname: sinon.stub().returns(''),
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: sinon.stub().returns(true),
                readFileSync: sinon.stub().returns('{}')
            },
            deepMerge: (a, b) => ({ ...a, ...b })
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        resolver.primaryMainConfig = { global_pdf_options: {}, math: {} };

        const finalLayeredConfig = {
            handler_script: 'index.js',
            some_key: 'value_from_override_layer'
        };
        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: finalLayeredConfig,
                mergedCssPaths: ['/fake/path.css']
            })
        };
        resolver.mergedPluginRegistry = {
            'my-plugin': {
                configPath: '/fake/path/to/plugin.config.yaml'
            }
        };

        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js', some_key: 'base_value' },
            resolvedCssPaths: [],
        });

        // Act
        const result = await resolver.getEffectiveConfig('my-plugin');

        // Assert
        expect(resolver.pluginConfigLoader.applyOverrideLayers.calledOnce).to.be.true;
        expect(result.pluginSpecificConfig).to.deep.equal(finalLayeredConfig);
    });
});
