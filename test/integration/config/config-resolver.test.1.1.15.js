// test/integration/config/config-resolver.test.1.1.15.js
const { configResolverPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require(configResolverPath);

// Test suite for Scenario 1.1.15
describe('ConfigResolver getEffectiveConfig (1.1.15)', () => {

    it('should return a cached configuration on a second call with identical arguments', async () => {
        // Arrange
        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                dirname: sinon.stub().returns(''),
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
        resolver.mergedPluginRegistry = { 'my-plugin': { configPath: '/fake/path' } };

        const applyOverridesSpy = sinon.stub().resolves({
            mergedConfig: { handler_script: 'index.js' },
            mergedCssPaths: []
        });
        resolver.pluginConfigLoader = {
            applyOverrideLayers: applyOverridesSpy
        };

        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js' },
            resolvedCssPaths: [],
        });

        // Act
        const result1 = await resolver.getEffectiveConfig('my-plugin', { some: 'override' });
        const result2 = await resolver.getEffectiveConfig('my-plugin', { some: 'override' });

        // Assert
        expect(applyOverridesSpy.callCount).to.equal(1);
        expect(result1).to.deep.equal(result2);
    });

    afterEach(() => {
        sinon.restore();
    });
});
