// test/integration/config/plugin-config-loader.test.1.6.6.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/config/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.6)', () => {
    let mockFs;
    let mockPath;
    let mockOs;
    let mockConfigUtils;
    let mockAssetResolver;
    let loader;

    beforeEach(() => {
        // Create mocks for all dependencies
        mockFs = {
            existsSync: sinon.stub(),
        };
        mockPath = {
            join: sinon.stub().callsFake((...args) => args.join('/')),
            isAbsolute: sinon.stub(),
            resolve: sinon.stub().callsFake((base, rel) => `${base}/${rel}`),
            dirname: sinon.stub().callsFake((p) => p.substring(0, p.lastIndexOf('/'))),
        };
        mockOs = {
            homedir: sinon.stub(),
        };
        mockConfigUtils = {
            loadYamlConfig: sinon.stub(),
            deepMerge: sinon.stub(),
            isObject: sinon.stub(),
        };
        mockAssetResolver = {
            resolveAndMergeCss: sinon.stub(),
        };

        // Initialize PluginConfigLoader with useFactoryDefaultsOnly = true
        loader = new PluginConfigLoader(
            '/mock/xdg/base', {}, '/mock/xdg/config.yaml', '/mock/project/base', {}, '/mock/project/config.yaml', true, // <--- key setting for this test
            {
                fs: mockFs,
                path: mockPath,
                os: mockOs,
                configUtils: mockConfigUtils,
                AssetResolver: mockAssetResolver,
            }
        );

        // Reset history of mocks after loader initialization to focus on applyOverrideLayers calls
        // This ensures that any calls made during the constructor's default dependency assignment don't interfere.
        mockFs.existsSync.resetHistory();
        mockPath.join.resetHistory();
        mockPath.isAbsolute.resetHistory();
        mockPath.resolve.resetHistory();
        mockPath.dirname.resetHistory();
        mockOs.homedir.resetHistory();
        mockConfigUtils.loadYamlConfig.resetHistory();
        mockConfigUtils.deepMerge.resetHistory();
        mockConfigUtils.isObject.resetHistory();
        mockAssetResolver.resolveAndMergeCss.resetHistory();
    });

    afterEach(() => {
        sinon.restore(); // Restore all stubs after each test
    });

    it('should return the original layer0ConfigData unchanged when useFactoryDefaultsOnly is true', async () => {
        const layer0ConfigData = {
            rawConfig: {
                initialSetting: 'value1',
                css_files: ['base.css'],
            },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        // It's important that this array is mutable and passed by reference if the function modifies it
        const contributingPaths = ['/path/to/base.config.yaml'];
        const initialContributingPathsReference = contributingPaths;

        const result = await loader.applyOverrideLayers('my-plugin', layer0ConfigData, contributingPaths);

        // Assertions: Verify that the original objects are returned and nothing is mutated or added.
        expect(result.mergedConfig).to.deep.equal(layer0ConfigData.rawConfig);
        expect(result.mergedConfig).to.equal(layer0ConfigData.rawConfig); // Ensure it's the exact same object reference

        expect(result.mergedCssPaths).to.deep.equal(layer0ConfigData.resolvedCssPaths);
        expect(result.mergedCssPaths).to.equal(layer0ConfigData.resolvedCssPaths); // Ensure it's the exact same object reference

        expect(result.contributingPaths).to.deep.equal(['/path/to/base.config.yaml']);
        expect(result.contributingPaths).to.equal(initialContributingPathsReference); // Ensure it's the exact same object reference

        // Verify no unexpected calls to external dependencies when skipping overrides
        expect(mockFs.existsSync.notCalled).to.be.true;
        expect(mockPath.join.notCalled).to.be.true;
        expect(mockPath.isAbsolute.notCalled).to.be.true;
        expect(mockPath.resolve.notCalled).to.be.true;
        expect(mockPath.dirname.notCalled).to.be.true;
        expect(mockOs.homedir.notCalled).to.be.true;
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true;
        expect(mockConfigUtils.deepMerge.notCalled).to.be.true;
        expect(mockConfigUtils.isObject.notCalled).to.be.true; // No object checks should be needed if the override logic is entirely skipped
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;
    });
});
