// test/integration/config-resolver/config-resolver.test.1.1.12.js
const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const ConfigResolver = require('../../../src/ConfigResolver');

// Test suite for Scenario 1.1.12
describe('ConfigResolver getEffectiveConfig (1.1.12)', () => {

    it('should correctly merge global and plugin-specific math configurations', async () => {
        // Arrange
        const deepMergeSpy = sinon.spy(_, 'merge');

        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                dirname: sinon.stub().returns(''),
                sep: '/',
                basename: sinon.stub().returns(''),
                extname: sinon.stub().returns(''),
                // FIX: Added path.join
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: sinon.stub().returns(true),
                // FIX: Added fs.readFileSync
                readFileSync: sinon.stub().returns('{}')
            },
            deepMerge: deepMergeSpy
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        resolver.primaryMainConfig = {
            math: {
                engine: 'katex',
                katex_options: {
                    displayMode: false,
                    fleqn: true
                }
            }
        };

        const pluginSpecificConfig = {
            handler_script: 'index.js',
            math: {
                katex_options: {
                    displayMode: true,
                    throwOnError: false
                }
            }
        };

        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: pluginSpecificConfig,
                mergedCssPaths: []
            })
        };
        resolver.mergedPluginRegistry = {
            'my-plugin': { configPath: '/fake/path' }
        };
        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js' },
            resolvedCssPaths: [],
        });
        
        // Act
        const result = await resolver.getEffectiveConfig('my-plugin');

        // Assert
        expect(deepMergeSpy.callCount).to.be.greaterThanOrEqual(2);

        const finalMathConfig = result.pluginSpecificConfig.math;
        expect(finalMathConfig.engine).to.equal('katex');

        const finalKatexOptions = finalMathConfig.katex_options;
        expect(finalKatexOptions.displayMode).to.be.true;
        expect(finalKatexOptions.fleqn).to.be.true;
        expect(finalKatexOptions.throwOnError).to.be.false;
    });

    afterEach(() => {
        sinon.restore();
    });
});
