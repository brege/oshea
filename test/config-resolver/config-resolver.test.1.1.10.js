// test/config-resolver/config-resolver.test.1.1.10.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.10
describe('ConfigResolver getEffectiveConfig (1.1.10)', () => {

    it('should correctly apply localConfigOverrides, including CSS resolution', async () => {
        // Arrange
        const mockAssetResolver = { resolveAndMergeCss: sinon.stub().returns(['/path/to/markdown/styles/override.css']) };
        
        const deepMergeStub = sinon.stub().callsFake((base, override) => {
            return { ...base, ...override, pdf_options: { ...base.pdf_options, ...override.pdf_options }};
        });

        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                dirname: sinon.stub().returns('/path/to/markdown'),
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
            deepMerge: deepMergeStub,
            AssetResolver: mockAssetResolver
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();
        resolver.primaryMainConfig = { global_pdf_options: {}, math: {} };
        resolver.mergedPluginRegistry = { 'my-plugin': { configPath: '/fake/path' } };

        const baseConfig = { handler_script: 'index.js', pdf_options: { scale: 1.0 } };
        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: { ...baseConfig },
                mergedCssPaths: ['/base/style.css']
            })
        };
        sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js' },
            resolvedCssPaths: [],
        });

        const localConfigOverrides = {
            pdf_options: { scale: 0.9 },
            css_files: ['../styles/override.css'],
            inherit_css: true
        };
        const markdownFilePath = '/path/to/markdown/file.md';

        // Act
        const result = await resolver.getEffectiveConfig('my-plugin', localConfigOverrides, markdownFilePath);

        // Assert
        expect(deepMergeStub.calledWith(sinon.match(baseConfig), localConfigOverrides)).to.be.true;
        
        expect(mockAssetResolver.resolveAndMergeCss.calledWith(
            localConfigOverrides.css_files,
            '/path/to/markdown',
            sinon.match.array,
            true
        )).to.be.true;

        expect(result.pluginSpecificConfig.pdf_options.scale).to.equal(0.9);
    });
});
