// test/config-resolver/config-resolver.test.1.1.12.js
const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const ConfigResolver = require('../../src/ConfigResolver');

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
                extname: sinon.stub().returns('')
            },
            fs: {
                existsSync: sinon.stub().returns(true)
            },
            deepMerge: deepMergeSpy
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        // --- Key for this test: Setup global and plugin-specific math options ---
        resolver.primaryMainConfig = {
            math: {
                engine: 'katex', // Global only
                katex_options: {
                    displayMode: false, // Global, will be overridden
                    fleqn: true // Global only
                }
            }
        };

        const pluginSpecificConfig = {
            handler_script: 'index.js',
            math: {
                katex_options: {
                    displayMode: true, // Plugin override
                    throwOnError: false // Plugin only
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
        // 1. Verify that deepMerge was called for the main math object and again for katex_options
        expect(deepMergeSpy.callCount).to.be.greaterThanOrEqual(2);

        // 2. Check the final merged math object
        const finalMathConfig = result.pluginSpecificConfig.math;
        expect(finalMathConfig.engine).to.equal('katex'); // From global

        // 3. Check the final merged katex_options object
        const finalKatexOptions = finalMathConfig.katex_options;
        expect(finalKatexOptions.displayMode).to.be.true; // Overridden by plugin
        expect(finalKatexOptions.fleqn).to.be.true; // From global
        expect(finalKatexOptions.throwOnError).to.be.false; // From plugin
    });

    afterEach(() => {
        sinon.restore();
    });
});
