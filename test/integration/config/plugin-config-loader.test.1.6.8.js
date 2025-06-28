// test/integration/config/plugin-config-loader.test.1.6.8.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/config/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.8)', () => {
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
            isObject: sinon.stub(),
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

    it('should correctly apply inline overrides from the xdgMainConfig', async () => {
        const pluginName = 'test-plugin';
        const xdgBaseDir = '/mock/xdg/config';
        const xdgMainConfigPath = '/mock/xdg/main_config.yaml';

        const layer0ConfigData = {
            rawConfig: { setting1: 'initial', css_files: ['base.css'] },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        const inlineXdgOverrideBlock = {
            setting1: 'inline-xdg-override',
            setting3: 'new-inline-setting',
            css_files: ['inline-xdg.css'],
            inherit_css: true,
        };
        const expectedMergedConfig = {
            setting1: 'inline-xdg-override',
            setting3: 'new-inline-setting',
            css_files: ['base.css', 'inline-xdg.css'],
        };
        const finalMergedCssPaths = ['/initial/base.css', '/resolved/inline-xdg.css'];

        // Configure loader instance and mocks
        loader.xdgBaseDir = xdgBaseDir;
        loader.xdgMainConfig = { [pluginName]: inlineXdgOverrideBlock };
        loader.xdgMainConfigPath = xdgMainConfigPath;

        mockFs.existsSync.returns(false); // Ensure XDG file-based override is skipped
        mockConfigUtils.isObject.withArgs(inlineXdgOverrideBlock).returns(true);
        mockConfigUtils.deepMerge.withArgs(layer0ConfigData.rawConfig, inlineXdgOverrideBlock).returns(expectedMergedConfig);
        mockAssetResolver.resolveAndMergeCss.withArgs(
            inlineXdgOverrideBlock.css_files,
            xdgBaseDir,
            layer0ConfigData.resolvedCssPaths,
            true, // inherit_css for inline XDG override
            pluginName,
            `${xdgMainConfigPath} (inline block)`
        ).returns(finalMergedCssPaths);
        mockPath.join.withArgs(xdgBaseDir || '~/.config/md-to-pdf', 'config.yaml (path not found)').returns('~/.config/md-to-pdf/config.yaml (path not found)');


        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions
        expect(mockFs.existsSync.called).to.be.true; // Should check for XDG file-based override first
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // Should not load XDG file
        expect(mockConfigUtils.isObject.calledWith(inlineXdgOverrideBlock)).to.be.true;
        expect(mockConfigUtils.deepMerge.calledWith(layer0ConfigData.rawConfig, inlineXdgOverrideBlock)).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.calledWith(
            inlineXdgOverrideBlock.css_files,
            xdgBaseDir,
            layer0ConfigData.resolvedCssPaths,
            true,
            pluginName,
            `${xdgMainConfigPath} (inline block)`
        )).to.be.true;

        expect(result.mergedConfig).to.deep.equal(expectedMergedConfig);
        expect(result.mergedCssPaths).to.deep.equal(finalMergedCssPaths);
        expect(result.contributingPaths).to.deep.equal([
            '/path/to/base.config.yaml',
            `Inline override from XDG main config: ${xdgMainConfigPath}`,
        ]);

        // Ensure no project overrides were attempted yet (order of operations)
        expect(mockConfigUtils.isObject.calledWith(loader.projectMainConfig[pluginName])).to.be.false;
        expect(mockPath.isAbsolute.notCalled).to.be.true;
        expect(mockOs.homedir.notCalled).to.be.true;
        expect(mockPath.resolve.notCalled).to.be.true;
        expect(mockPath.dirname.notCalled).to.be.true;
    });
});
