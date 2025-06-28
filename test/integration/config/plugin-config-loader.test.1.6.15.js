// test/integration/config/plugin-config-loader.test.1.6.15.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/config/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.15)', () => {
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
            // Mimic deepMerge behavior: for conflicting scalar properties, the 'source' (right-hand side) wins.
            // For arrays, it will concatenate, but for this test, scalar wins are key.
            deepMerge: sinon.stub().callsFake((target, source) => {
                const merged = { ...target };
                for (const key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        merged[key] = source[key]; // Simple override for scalar values
                    }
                }
                return merged;
            }),
            isObject: sinon.stub(),
        };
        mockAssetResolver = {
            // Ensure css is treated as an array even if undefined
            resolveAndMergeCss: sinon.stub().callsFake((css, base, current, inherit, name, path) => [...current, ...(css || []).map(c => `/resolved/${c}`)]),
        };

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

    it('should correctly apply precedence: project overrides (file then inline) > XDG (file then inline) > base config', async () => {
        const pluginName = 'precedence-plugin';

        // Layer 0: Initial config
        const layer0ConfigData = {
            rawConfig: { commonSetting: 'base-value', onlyBase: 'unique', css_files: [] }, // Added css_files
            resolvedCssPaths: [],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        // XDG File Layer
        const xdgBaseDir = '/mock/xdg-config';
        const xdgPluginOverrideFilePath = `${xdgBaseDir}/${pluginName}/${pluginName}.config.yaml`;
        const xdgOverrideConfig = { commonSetting: 'xdg-file-value', onlyXdgFile: 'unique', css_files: [] }; // Added css_files

        // XDG Inline Layer
        const xdgMainConfigPath = '/mock/xdg-config/config.yaml';
        const inlineXdgOverrideBlock = { commonSetting: 'xdg-inline-value', onlyXdgInline: 'unique', css_files: [] }; // Added css_files

        // Project File Layer
        const projectBaseDir = '/mock/project-root';
        const projectOverrideRelPath = 'config/project-file.config.yaml';
        const projectOverrideAbsPath = `${projectBaseDir}/config/project-file.config.yaml`;
        const projectOverrideConfig = { commonSetting: 'project-file-value', onlyProjectFile: 'unique', css_files: [] }; // Added css_files

        // Project Inline Layer
        const projectMainConfigPath = '/mock/project-root/main.config.yaml';
        const inlineProjectOverrideBlock = { commonSetting: 'project-inline-value', onlyProjectInline: 'unique', css_files: [] }; // Added css_files

        // Configure loader properties to activate all layers
        loader.xdgBaseDir = xdgBaseDir;
        loader.xdgMainConfig = { [pluginName]: inlineXdgOverrideBlock };
        loader.xdgMainConfigPath = xdgMainConfigPath;
        loader.projectBaseDir = projectBaseDir;
        loader.projectMainConfig = {
            plugins: { [pluginName]: projectOverrideRelPath },
            [pluginName]: inlineProjectOverrideBlock
        };
        loader.projectMainConfigPath = projectMainConfigPath;

        // Configure mockFs.existsSync for file-based overrides
        mockFs.existsSync.withArgs(xdgPluginOverrideFilePath).returns(true);
        mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(true);
        // Configure mockConfigUtils.isObject for inline overrides
        mockConfigUtils.isObject.withArgs(inlineXdgOverrideBlock).returns(true);
        mockConfigUtils.isObject.withArgs(inlineProjectOverrideBlock).returns(true);

        // Configure config loaders for file-based overrides
        mockConfigUtils.loadYamlConfig.withArgs(xdgPluginOverrideFilePath).resolves(xdgOverrideConfig);
        mockConfigUtils.loadYamlConfig.withArgs(projectOverrideAbsPath).resolves(projectOverrideConfig);

        // Configure path mocks for project file-based override
        mockPath.isAbsolute.withArgs(projectOverrideRelPath).returns(false);
        mockPath.resolve.withArgs(projectBaseDir, projectOverrideRelPath).returns(projectOverrideAbsPath);


        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions for mergedConfig precedence
        // The commonSetting should reflect the highest precedence (Project Inline)
        expect(result.mergedConfig.commonSetting).to.equal('project-inline-value');
        expect(result.mergedConfig.onlyBase).to.equal('unique');
        expect(result.mergedConfig.onlyXdgFile).to.equal('unique');
        expect(result.mergedConfig.onlyXdgInline).to.equal('unique');
        expect(result.mergedConfig.onlyProjectFile).to.equal('unique');
        expect(result.mergedConfig.onlyProjectInline).to.equal('unique');

        // All deepMerge calls should have occurred in the correct order
        expect(mockConfigUtils.deepMerge.callCount).to.equal(4); // XDG file, XDG inline, Project file, Project inline

        // Verify the arguments and return values of deepMerge for order of application
        // The first call should merge base with XDG file
        expect(mockConfigUtils.deepMerge.getCall(0).args[0].commonSetting).to.equal('base-value');
        expect(mockConfigUtils.deepMerge.getCall(0).args[1].commonSetting).to.equal('xdg-file-value');
        const afterXdgFile = mockConfigUtils.deepMerge.getCall(0).returnValue;

        // Second call should merge result of first with XDG inline
        expect(mockConfigUtils.deepMerge.getCall(1).args[0].commonSetting).to.equal('xdg-file-value');
        expect(mockConfigUtils.deepMerge.getCall(1).args[1].commonSetting).to.equal('xdg-inline-value');
        const afterXdgInline = mockConfigUtils.deepMerge.getCall(1).returnValue;

        // Third call should merge result of second with Project file
        expect(mockConfigUtils.deepMerge.getCall(2).args[0].commonSetting).to.equal('xdg-inline-value');
        expect(mockConfigUtils.deepMerge.getCall(2).args[1].commonSetting).to.equal('project-file-value');
        const afterProjectFile = mockConfigUtils.deepMerge.getCall(2).returnValue;

        // Fourth call should merge result of third with Project inline
        expect(mockConfigUtils.deepMerge.getCall(3).args[0].commonSetting).to.equal('project-file-value');
        expect(mockConfigUtils.deepMerge.getCall(3).args[1].commonSetting).to.equal('project-inline-value');
        const afterProjectInline = mockConfigUtils.deepMerge.getCall(3).returnValue;

        expect(result.mergedConfig).to.deep.equal(afterProjectInline);
    });
});
