// test/plugin-config-loader/plugin-config-loader.test.1.6.7.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../src/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.7)', () => {
    let mockFs;
    let mockPath;
    let mockOs;
    let mockConfigUtils;
    let mockAssetResolver;
    let loader;

    beforeEach(() => {
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
            isObject: sinon.stub().returns(false), // Default to false for isObject unless specifically testing inline overrides
        };
        mockAssetResolver = {
            resolveAndMergeCss: sinon.stub(),
        };

        // Initialize PluginConfigLoader with useFactoryDefaultsOnly = false
        loader = new PluginConfigLoader(
            '/xdg/base', {}, '/xdg/config.yaml', '/proj/base', {}, '/proj/config.yaml', false,
            {
                fs: mockFs,
                path: mockPath,
                os: mockOs,
                configUtils: mockConfigUtils,
                AssetResolver: mockAssetResolver,
            }
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly apply overrides from an XDG-specific plugin config file if it exists', async () => {
        const pluginName = 'test-plugin';
        const xdgBaseDir = '/mock/xdg/config';
        const xdgPluginOverrideDir = `${xdgBaseDir}/${pluginName}`;
        const xdgPluginOverrideFilePath = `${xdgPluginOverrideDir}/${pluginName}.config.yaml`;

        const layer0ConfigData = {
            rawConfig: { setting1: 'initial', css_files: ['base.css'] },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        const xdgOverrideConfig = {
            setting1: 'xdg-override',
            setting2: 'new-setting',
            css_files: ['xdg.css'],
            inherit_css: true,
        };
        const expectedMergedConfig = {
            setting1: 'xdg-override',
            setting2: 'new-setting',
            css_files: ['base.css', 'xdg.css'], // deepMerge behavior on arrays depends on deepMerge implementation
        };
        const expectedXdgResolvedCssPaths = ['/resolved/xdg.css'];
        const finalMergedCssPaths = ['/initial/base.css', '/resolved/xdg.css']; // Assuming AssetResolver appends

        // Configure mocks
        loader.xdgBaseDir = xdgBaseDir; // Set the xdgBaseDir for the loader instance
        mockFs.existsSync.withArgs(xdgPluginOverrideFilePath).returns(true);
        mockConfigUtils.loadYamlConfig.withArgs(xdgPluginOverrideFilePath).resolves(xdgOverrideConfig);
        mockConfigUtils.deepMerge.withArgs(layer0ConfigData.rawConfig, xdgOverrideConfig).returns(expectedMergedConfig); // Mock deepMerge result
        mockAssetResolver.resolveAndMergeCss.withArgs(
            xdgOverrideConfig.css_files,
            xdgPluginOverrideDir,
            layer0ConfigData.resolvedCssPaths,
            xdgOverrideConfig.inherit_css,
            pluginName,
            xdgPluginOverrideFilePath
        ).returns(finalMergedCssPaths);
        // Ensure that path.join for xdgPluginOverrideFilePath returns the expected path
        mockPath.join.withArgs(xdgBaseDir, pluginName).returns(xdgPluginOverrideDir);
        mockPath.join.withArgs(xdgPluginOverrideDir, `${pluginName}.config.yaml`).returns(xdgPluginOverrideFilePath);

        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions
        expect(mockFs.existsSync.calledWith(xdgPluginOverrideFilePath)).to.be.true;
        expect(mockConfigUtils.loadYamlConfig.calledWith(xdgPluginOverrideFilePath)).to.be.true;
        expect(mockConfigUtils.deepMerge.calledWith(layer0ConfigData.rawConfig, xdgOverrideConfig)).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.calledWith(
            xdgOverrideConfig.css_files,
            xdgPluginOverrideDir,
            layer0ConfigData.resolvedCssPaths,
            xdgOverrideConfig.inherit_css,
            pluginName,
            xdgPluginOverrideFilePath
        )).to.be.true;

        expect(result.mergedConfig).to.deep.equal(expectedMergedConfig);
        expect(result.mergedCssPaths).to.deep.equal(finalMergedCssPaths);
        expect(result.contributingPaths).to.deep.equal([
            '/path/to/base.config.yaml',
            xdgPluginOverrideFilePath,
        ]);

        // Ensure no project overrides were attempted
        expect(mockConfigUtils.isObject.calledWith(loader.projectMainConfig[pluginName])).to.be.false;
        expect(mockPath.isAbsolute.notCalled).to.be.true;
        expect(mockOs.homedir.notCalled).to.be.true;
        expect(mockPath.resolve.notCalled).to.be.true;
        expect(mockPath.dirname.notCalled).to.be.true;
    });
});
