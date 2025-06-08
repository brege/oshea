// test/plugin-config-loader/plugin-config-loader.test.1.6.10.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../src/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.10)', () => {
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

    it('should correctly apply inline overrides from the projectMainConfig', async () => {
        const pluginName = 'project-inline-plugin';
        const projectBaseDir = '/mock/project/root';
        const projectMainConfigPath = '/mock/project/main_config.yaml';

        const layer0ConfigData = {
            rawConfig: { setting1: 'initial', css_files: ['base.css'] },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        const inlineProjectOverrideBlock = {
            setting1: 'inline-project-override',
            setting5: 'new-inline-project-setting',
            css_files: ['inline-project.css'],
            inherit_css: true,
        };
        const expectedMergedConfig = {
            setting1: 'inline-project-override',
            setting5: 'new-inline-project-setting',
            css_files: ['base.css', 'inline-project.css'],
        };
        const finalMergedCssPaths = ['/initial/base.css', '/resolved/inline-project.css'];

        // Configure loader instance and mocks
        loader.projectBaseDir = projectBaseDir;
        loader.projectMainConfig = { [pluginName]: inlineProjectOverrideBlock }; // Inline override directly under pluginName key
        loader.projectMainConfigPath = projectMainConfigPath;

        // Ensure XDG and Project file-based overrides are skipped
        mockFs.existsSync.returns(false);
        // Ensure isObject returns true for the inline block check
        mockConfigUtils.isObject.withArgs(inlineProjectOverrideBlock).returns(true);
        // Mock deepMerge and AssetResolver calls
        mockConfigUtils.deepMerge.withArgs(layer0ConfigData.rawConfig, inlineProjectOverrideBlock).returns(expectedMergedConfig);
        mockAssetResolver.resolveAndMergeCss.withArgs(
            inlineProjectOverrideBlock.css_files,
            projectBaseDir, // Base for inline project override is projectBaseDir
            layer0ConfigData.resolvedCssPaths,
            true, // inherit_css
            pluginName,
            `${projectMainConfigPath} (inline block)`
        ).returns(finalMergedCssPaths);
        mockPath.join.withArgs(projectBaseDir || '.', 'config.yaml (path not found)').returns('./config.yaml (path not found)');


        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions
        // Ensure XDG file-based and Project file-based checks were performed but skipped
        expect(mockFs.existsSync.called).to.be.true;
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // No file loads occurred for overrides

        // Verify inline project override logic
        expect(mockConfigUtils.isObject.calledWith(inlineProjectOverrideBlock)).to.be.true;
        expect(mockConfigUtils.deepMerge.calledWith(layer0ConfigData.rawConfig, inlineProjectOverrideBlock)).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.calledWith(
            inlineProjectOverrideBlock.css_files,
            projectBaseDir,
            layer0ConfigData.resolvedCssPaths,
            true,
            pluginName,
            `${projectMainConfigPath} (inline block)`
        )).to.be.true;

        expect(result.mergedConfig).to.deep.equal(expectedMergedConfig);
        expect(result.mergedCssPaths).to.deep.equal(finalMergedCssPaths);
        expect(result.contributingPaths).to.deep.equal([
            '/path/to/base.config.yaml',
            `Inline override from project main config: ${projectMainConfigPath}`,
        ]);

        // Ensure path resolution methods for file-based overrides were not called unnecessarily
        expect(mockPath.isAbsolute.notCalled).to.be.true;
        expect(mockOs.homedir.notCalled).to.be.true;
        expect(mockPath.resolve.notCalled).to.be.true;
        expect(mockPath.dirname.notCalled).to.be.true;
    });
});
