// test/integration/config-resolver/config-resolver.test.1.1.13.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/ConfigResolver');

// Test suite for Scenario 1.1.13
describe('ConfigResolver getEffectiveConfig (1.1.13)', () => {

    it('should consolidate and filter css_files to be unique and existing', async () => {
        // Arrange
        const existsSyncStub = sinon.stub();
        
        existsSyncStub.withArgs('/path/to/style.css').returns(true);
        existsSyncStub.withArgs('/path/to/duplicate.css').returns(true);
        existsSyncStub.withArgs('/resolved/path/to/handler.js').returns(true);
        existsSyncStub.withArgs('/fake/path').returns(true); 
        existsSyncStub.withArgs('/path/to/non-existent.css').returns(false);

        const mockDependencies = {
            path: {
                resolve: sinon.stub().returns('/resolved/path/to/handler.js'),
                dirname: sinon.stub().returns(''),
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
        resolver.mergedPluginRegistry = { 'my-plugin': { configPath: '/fake/path' } };

        const unFilteredCssPaths = [
            '/path/to/style.css',
            '/path/to/duplicate.css',
            null,
            '/path/to/non-existent.css',
            '/path/to/duplicate.css'
        ];

        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: { handler_script: 'handler.js' },
                mergedCssPaths: unFilteredCssPaths
            })
        };
        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'handler.js' },
            resolvedCssPaths: [],
        });

        // Act
        const result = await resolver.getEffectiveConfig('my-plugin');
        
        // Assert
        const finalCssFiles = result.pluginSpecificConfig.css_files;
        expect(finalCssFiles).to.be.an('array').with.lengthOf(2);
        expect(finalCssFiles).to.include('/path/to/style.css');
        expect(finalCssFiles).to.include('/path/to/duplicate.css');
    });

    afterEach(() => {
        sinon.restore();
    });
});
