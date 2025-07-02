// test/integration/config/plugin-config-loader.test.1.6.13.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require(pluginConfigLoaderPath);

describe('PluginConfigLoader applyOverrideLayers (1.6.13)', () => {
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
            deepMerge: sinon.stub().callsFake((target, source) => ({ ...target, ...source })), // Simple deepMerge mock
            isObject: sinon.stub(),
        };
        mockAssetResolver = {
            resolveAndMergeCss: sinon.stub().callsFake((css, base, current, inherit, name, path) => [...current, ...(css || []).map(c => `/resolved/${c}`)]), // Ensure css is not undefined
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

    it('should accurately update contributingPaths with the paths of all applied override layers', async () => {
        const pluginName = 'contributing-paths-plugin';

        // Base Layer 0
        const layer0ConfigData = {
            rawConfig: { some: 'base', css_files: [] }, // Added css_files
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base/base.config.yaml',
        };
        const initialContributingPaths = ['/path/to/base/base.config.yaml'];

        // XDG File Layer
        const xdgBaseDir = '/mock/xdg-config';
        const xdgPluginOverrideFilePath = `${xdgBaseDir}/${pluginName}/${pluginName}.config.yaml`;
        const xdgOverrideConfig = { some: 'xdg-file', css_files: [] }; // Added css_files

        // XDG Inline Layer
        const xdgMainConfigPath = '/mock/xdg-config/config.yaml';
        const inlineXdgOverrideBlock = { some: 'xdg-inline', css_files: [] }; // Added css_files

        // Project File Layer
        const projectBaseDir = '/mock/project-root';
        const projectOverrideRelPath = 'config/project-file.config.yaml';
        const projectOverrideAbsPath = `${projectBaseDir}/config/project-file.config.yaml`;
        const projectOverrideConfig = { some: 'project-file', css_files: [] }; // Added css_files

        // Project Inline Layer
        const projectMainConfigPath = '/mock/project-root/main.config.yaml';
        const inlineProjectOverrideBlock = { some: 'project-inline', css_files: [] }; // Added css_files

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

        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, initialContributingPaths);

        // Assertions for contributingPaths
        expect(result.contributingPaths).to.deep.equal([
            '/path/to/base/base.config.yaml',
            xdgPluginOverrideFilePath,
            `Inline override from XDG main config: ${xdgMainConfigPath}`,
            projectOverrideAbsPath,
            `Inline override from project main config: ${projectMainConfigPath}`,
        ]);

        // Verify the count of contributing paths
        expect(result.contributingPaths).to.have.length(5);
    });
});
