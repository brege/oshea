// test/integration/config/config-resolver.test.1.1.11.js
const { configResolverPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const ConfigResolver = require(configResolverPath);

// Test suite for Scenario 1.1.11
describe('ConfigResolver getEffectiveConfig (1.1.11)', () => {

    it('should correctly merge global and plugin-specific pdf_options', async () => {
        // Arrange
        const deepMergeSpy = sinon.spy(_, 'merge');

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
            deepMerge: deepMergeSpy
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        resolver.primaryMainConfig = {
            global_pdf_options: {
                format: 'A4',
                margin: { top: '1in', bottom: '1in' }
            },
            math: {}
        };

        const pluginSpecificConfig = {
            handler_script: 'index.js',
            pdf_options: {
                printBackground: true,
                margin: { top: '0.5in', left: '0.5in' }
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

        const finalPdfOptions = result.pluginSpecificConfig.pdf_options;
        expect(finalPdfOptions.format).to.equal('A4');
        expect(finalPdfOptions.printBackground).to.be.true;

        const finalMargin = finalPdfOptions.margin;
        expect(finalMargin.top).to.equal('0.5in');
        expect(finalMargin.bottom).to.equal('1in');
        expect(finalMargin.left).to.equal('0.5in');
    });

    afterEach(() => {
        sinon.restore();
    });
});
