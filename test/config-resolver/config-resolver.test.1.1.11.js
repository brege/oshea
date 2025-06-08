// test/config-resolver/config-resolver.test.1.1.11.js
const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash'); // Use the real lodash for a realistic merge simulation
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.11
describe('ConfigResolver getEffectiveConfig (1.1.11)', () => {

    it('should correctly merge global and plugin-specific pdf_options', async () => {
        // Arrange
        // Spy on a real deepMerge implementation to verify calls and get real merge behavior
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

        // --- Key for this test: Setup global and plugin-specific PDF options ---
        resolver.primaryMainConfig = {
            global_pdf_options: {
                format: 'A4', // Global only
                margin: { top: '1in', bottom: '1in' } // Global margin
            },
            math: {}
        };

        const pluginSpecificConfig = {
            handler_script: 'index.js',
            pdf_options: {
                printBackground: true, // Plugin only
                margin: { top: '0.5in', left: '0.5in' } // Plugin margin (should override top)
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
        // 1. Verify that deepMerge was called for pdf_options and again for the nested margin
        expect(deepMergeSpy.callCount).to.be.greaterThanOrEqual(2);

        // 2. Check the final merged pdf_options object
        const finalPdfOptions = result.pluginSpecificConfig.pdf_options;
        expect(finalPdfOptions.format).to.equal('A4'); // From global
        expect(finalPdfOptions.printBackground).to.be.true; // From plugin
        
        // 3. Check the final merged margin object
        const finalMargin = finalPdfOptions.margin;
        expect(finalMargin.top).to.equal('0.5in'); // Overridden by plugin
        expect(finalMargin.bottom).to.equal('1in'); // From global
        expect(finalMargin.left).to.equal('0.5in'); // From plugin
    });

    afterEach(() => {
        sinon.restore();
    });
});
