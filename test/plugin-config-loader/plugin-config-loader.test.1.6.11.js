// test/plugin-config-loader/plugin-config-loader.test.1.6.11.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../src/plugin_config_loader');

describe('PluginConfigLoader applyOverrideLayers (1.6.11)', () => {
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

    it('should correctly merge CSS files and respect inherit_css across all override layers', async () => {
        const pluginName = 'css-merge-plugin';
        const initialCssPaths = ['/initial/base.css'];
        const contributingPaths = ['/path/to/base.config.yaml'];

        // Layer 0: Initial config (passed as layer0ConfigData)
        const layer0ConfigData = {
            rawConfig: { css_files: ['base.css'], initialSetting: 'base' },
            resolvedCssPaths: initialCssPaths,
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };

        // Layer 1.1: XDG File Override
        const xdgPluginOverrideFilePath = '/xdg/base/css-merge-plugin/css-merge-plugin.config.yaml';
        const xdgPluginOverrideDir = '/xdg/base/css-merge-plugin';
        const xdgOverrideConfig = { css_files: ['xdg.css'], inherit_css: true, xdgSetting: 'xdg' };
        // Expected CSS paths after XDG file's internal resolution in _loadSingleConfigLayer
        const xdgFileInternalResolvedCss = ['/resolved-internal/xdg.css'];
        // Expected CSS paths after XDG file's merge in applyOverrideLayers
        const cssAfterXdgFile = ['/initial/base.css', '/resolved-internal/xdg.css'];

        // Layer 1.2: XDG Inline Override
        const xdgMainConfigPath = '/xdg/config.yaml';
        const inlineXdgOverrideBlock = { css_files: ['inline-xdg.css'], inherit_css: false, inlineXdgSetting: 'inline-xdg' };
        const cssAfterXdgInline = ['/initial/base.css', '/resolved-internal/xdg.css', '/new-resolved/inline-xdg.css'];

        // Layer 2.1: Project File Override
        const projectOverrideRelPath = 'project/css-merge-plugin.config.yaml';
        const projectOverrideAbsPath = '/proj/base/project/css-merge-plugin.config.yaml';
        const projectOverrideAssetBase = '/proj/base/project';
        const projectOverrideConfig = { css_files: ['project.css'], inherit_css: true, projectSetting: 'project' };
        // Expected CSS paths after Project file's internal resolution in _loadSingleConfigLayer
        const projectFileInternalResolvedCss = ['/resolved-internal/project.css'];
        // Expected CSS paths after Project file's merge in applyOverrideLayers
        const cssAfterProjectFile = ['/initial/base.css', '/resolved-internal/xdg.css', '/new-resolved/inline-xdg.css', '/resolved-internal/project.css'];


        // Layer 2.2: Project Inline Override
        const projectMainConfigPath = '/proj/config.yaml';
        const inlineProjectOverrideBlock = { css_files: ['inline-project.css'], inherit_css: false, inlineProjectSetting: 'inline-project' };
        const cssAfterProjectInline = ['/initial/base.css', '/resolved-internal/xdg.css', '/new-resolved/inline-xdg.css', '/resolved-internal/project.css', '/final-resolved/inline-project.css'];


        // Configure loader properties
        loader.xdgBaseDir = '/xdg/base';
        loader.xdgMainConfig = { [pluginName]: inlineXdgOverrideBlock };
        loader.xdgMainConfigPath = xdgMainConfigPath;
        loader.projectBaseDir = '/proj/base';
        loader.projectMainConfig = {
            plugins: { [pluginName]: projectOverrideRelPath },
            [pluginName]: inlineProjectOverrideBlock
        };
        loader.projectMainConfigPath = projectMainConfigPath;

        // Configure mocks for file existence
        mockFs.existsSync.withArgs(xdgPluginOverrideFilePath).returns(true);
        mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(true);

        // Configure mocks for config loading
        mockConfigUtils.loadYamlConfig.withArgs(xdgPluginOverrideFilePath).resolves(xdgOverrideConfig);
        mockConfigUtils.loadYamlConfig.withArgs(projectOverrideAbsPath).resolves(projectOverrideConfig);

        // Configure mocks for deepMerge and isObject
        mockConfigUtils.deepMerge.callsFake((current, override) => ({ ...current, ...override })); // Simple merge for testing config values
        mockConfigUtils.isObject.returns(true); // For inline overrides

        // Configure mocks for AssetResolver.resolveAndMergeCss with specific arguments for each call
        // 1. Call from XDG File _loadSingleConfigLayer (internal call)
        mockAssetResolver.resolveAndMergeCss.withArgs(
            xdgOverrideConfig.css_files,
            xdgPluginOverrideDir,
            [], // _loadSingleConfigLayer always starts with empty currentCssPaths
            false, // _loadSingleConfigLayer always uses false for inherit_css
            pluginName,
            xdgPluginOverrideFilePath
        ).returns(xdgFileInternalResolvedCss);

        // 2. Call from applyOverrideLayers for XDG File (merging internal result with current)
        mockAssetResolver.resolveAndMergeCss.withArgs(
            xdgOverrideConfig.css_files,
            xdgPluginOverrideDir,
            initialCssPaths, // currentCssPaths when XDG file is applied
            xdgOverrideConfig.inherit_css, // true from xdgOverrideConfig
            pluginName,
            xdgPluginOverrideFilePath
        ).returns(cssAfterXdgFile);

        // 3. Call from applyOverrideLayers for XDG Inline Override
        mockAssetResolver.resolveAndMergeCss.withArgs(
            inlineXdgOverrideBlock.css_files,
            loader.xdgBaseDir,
            cssAfterXdgFile, // currentCssPaths when XDG inline is applied
            inlineXdgOverrideBlock.inherit_css, // false from inlineXdgOverrideBlock
            pluginName,
            `${xdgMainConfigPath} (inline block)`
        ).returns(cssAfterXdgInline);

        // Configure path mocks for Project File Override
        mockPath.isAbsolute.withArgs(projectOverrideRelPath).returns(false);
        mockPath.resolve.withArgs(loader.projectBaseDir, projectOverrideRelPath).returns(projectOverrideAbsPath);
        mockPath.dirname.withArgs(projectOverrideAbsPath).returns(projectOverrideAssetBase);

        // 4. Call from Project File _loadSingleConfigLayer (internal call)
        mockAssetResolver.resolveAndMergeCss.withArgs(
            projectOverrideConfig.css_files,
            projectOverrideAssetBase,
            [], // _loadSingleConfigLayer always starts with empty currentCssPaths
            false, // _loadSingleConfigLayer always uses false for inherit_css
            pluginName,
            projectOverrideAbsPath
        ).returns(projectFileInternalResolvedCss);

        // 5. Call from applyOverrideLayers for Project File (merging internal result with current)
        mockAssetResolver.resolveAndMergeCss.withArgs(
            projectOverrideConfig.css_files,
            projectOverrideAssetBase,
            cssAfterXdgInline, // currentCssPaths when Project file is applied
            projectOverrideConfig.inherit_css, // true from projectOverrideConfig
            pluginName,
            projectOverrideAbsPath
        ).returns(cssAfterProjectFile);

        // 6. Call from applyOverrideLayers for Project Inline Override
        mockAssetResolver.resolveAndMergeCss.withArgs(
            inlineProjectOverrideBlock.css_files,
            loader.projectBaseDir,
            cssAfterProjectFile, // currentCssPaths when Project inline is applied
            inlineProjectOverrideBlock.inherit_css, // false from inlineProjectOverrideBlock
            pluginName,
            `${projectMainConfigPath} (inline block)`
        ).returns(cssAfterProjectInline);

        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions for final merged CSS paths
        expect(result.mergedCssPaths).to.deep.equal(cssAfterProjectInline);

        // Verify AssetResolver calls count: 2 (XDG file internal + external) + 1 (XDG inline) + 2 (Project file internal + external) + 1 (Project inline) = 6 calls
        expect(mockAssetResolver.resolveAndMergeCss.callCount).to.equal(6);

        // Verify specific arguments for each call
        // Call 0 (XDG file internal)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[0]).to.deep.equal(xdgOverrideConfig.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[2]).to.deep.equal([]);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[3]).to.be.false;

        // Call 1 (XDG file external)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(1).args[0]).to.deep.equal(xdgOverrideConfig.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(1).args[2]).to.deep.equal(initialCssPaths);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(1).args[3]).to.be.true; // inherit_css for XDG file

        // Call 2 (XDG inline)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(2).args[0]).to.deep.equal(inlineXdgOverrideBlock.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(2).args[2]).to.deep.equal(cssAfterXdgFile);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(2).args[3]).to.be.false; // inherit_css for XDG inline

        // Call 3 (Project file internal)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(3).args[0]).to.deep.equal(projectOverrideConfig.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(3).args[2]).to.deep.equal([]);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(3).args[3]).to.be.false;

        // Call 4 (Project file external)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(4).args[0]).to.deep.equal(projectOverrideConfig.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(4).args[2]).to.deep.equal(cssAfterXdgInline);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(4).args[3]).to.be.true; // inherit_css for Project file

        // Call 5 (Project inline)
        expect(mockAssetResolver.resolveAndMergeCss.getCall(5).args[0]).to.deep.equal(inlineProjectOverrideBlock.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(5).args[2]).to.deep.equal(cssAfterProjectFile);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(5).args[3]).to.be.false; // inherit_css for Project inline

        // Also check contributingPaths
        expect(result.contributingPaths).to.have.length(5); // base, XDG file, XDG inline, Project file, Project inline
        expect(result.contributingPaths).to.include(xdgPluginOverrideFilePath);
        expect(result.contributingPaths).to.include(`Inline override from XDG main config: ${xdgMainConfigPath}`);
        expect(result.contributingPaths).to.include(projectOverrideAbsPath);
        expect(result.contributingPaths).to.include(`Inline override from project main config: ${projectMainConfigPath}`);
    });
});
