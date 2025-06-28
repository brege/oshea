// test/integration/plugin-config-loader/plugin-config-loader.test.1.6.9.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.9)', () => {
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

    it('should correctly apply overrides from a project-specific plugin config file referenced in projectMainConfig.plugins[pluginName]', async () => {
        const pluginName = 'project-plugin';
        const projectBaseDir = '/mock/project/root';
        const projectOverrideRelPath = 'configs/project-plugin.config.yaml';
        const projectOverrideAbsPath = `${projectBaseDir}/configs/project-plugin.config.yaml`;
        const projectOverrideAssetBase = `${projectBaseDir}/configs`;

        const layer0ConfigData = {
            rawConfig: { setting1: 'initial', css_files: ['base.css'] },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        const projectOverrideConfig = {
            setting1: 'project-override',
            setting4: 'new-project-setting',
            css_files: ['project.css'],
            inherit_css: true,
        };
        const expectedMergedConfig = {
            setting1: 'project-override',
            setting4: 'new-project-setting',
            css_files: ['base.css', 'project.css'],
        };
        const finalMergedCssPaths = ['/initial/base.css', '/resolved/project.css'];

        // Configure loader instance and mocks
        loader.projectBaseDir = projectBaseDir;
        loader.projectMainConfig = { plugins: { [pluginName]: projectOverrideRelPath } };
        loader.xdgMainConfig = {}; // Ensure no inline XDG override
        mockFs.existsSync.returns(false); // Skip XDG file-based override
        mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(true); // File exists for project override

        mockConfigUtils.loadYamlConfig.withArgs(projectOverrideAbsPath).resolves(projectOverrideConfig);
        mockConfigUtils.deepMerge.withArgs(layer0ConfigData.rawConfig, projectOverrideConfig).returns(expectedMergedConfig);
        mockAssetResolver.resolveAndMergeCss.withArgs(
            projectOverrideConfig.css_files,
            projectOverrideAssetBase,
            layer0ConfigData.resolvedCssPaths,
            projectOverrideConfig.inherit_css,
            pluginName,
            projectOverrideAbsPath
        ).returns(finalMergedCssPaths);

        mockPath.isAbsolute.withArgs(projectOverrideRelPath).returns(false);
        mockPath.resolve.withArgs(projectBaseDir, projectOverrideRelPath).returns(projectOverrideAbsPath);
        mockPath.dirname.withArgs(projectOverrideAbsPath).returns(projectOverrideAssetBase);


        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions
        expect(mockFs.existsSync.calledWith(projectOverrideAbsPath)).to.be.true; // Check for project override file
        expect(mockConfigUtils.loadYamlConfig.calledWith(projectOverrideAbsPath)).to.be.true;
        expect(mockConfigUtils.deepMerge.calledWith(layer0ConfigData.rawConfig, projectOverrideConfig)).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.calledWith(
            projectOverrideConfig.css_files,
            projectOverrideAssetBase,
            layer0ConfigData.resolvedCssPaths,
            projectOverrideConfig.inherit_css,
            pluginName,
            projectOverrideAbsPath
        )).to.be.true;

        expect(result.mergedConfig).to.deep.equal(expectedMergedConfig);
        expect(result.mergedCssPaths).to.deep.equal(finalMergedCssPaths);
        expect(result.contributingPaths).to.deep.equal([
            '/path/to/base.config.yaml',
            projectOverrideAbsPath,
        ]);

        // Ensure inline project override is not attempted yet (order of operations)
        expect(mockConfigUtils.isObject.calledWith(loader.projectMainConfig[pluginName])).to.be.false;
    });
});
