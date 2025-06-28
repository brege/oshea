// test/integration/config/plugin-config-loader.test.1.6.14.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/config/plugin_config_loader');

// Define this constant locally to ensure consistency with the module under test
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

describe('PluginConfigLoader applyOverrideLayers (1.6.14)', () => {
    let mockFs;
    let mockPath;
    let mockOs;
    let mockConfigUtils;
    let mockAssetResolver;
    let loader;
    let consoleWarnStub;

    beforeEach(() => {
        mockFs = {
            existsSync: sinon.stub(), // Just a stub, no default return value
        };
        mockPath = {
            join: sinon.stub().callsFake((...args) => args.join('/')), // Use callsFake for general behavior
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
            isObject: sinon.stub().returns(false), // Default to false for inline overrides
        };
        mockAssetResolver = {
            resolveAndMergeCss: sinon.stub(),
        };

        // Initialize PluginConfigLoader with mocks for every test
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

        // Stub console.warn to capture warnings
        consoleWarnStub = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        sinon.restore(); // Restore all stubs, including console.warn
    });

    it('should gracefully handle non-existent XDG plugin config file by skipping it (no warning logged by current code)', async () => {
        const pluginName = 'non-existent-xdg-plugin';
        const xdgBaseDir = '/mock/xdg-config';

        // Dynamically construct the path that the loader will actually generate using the mocked path.join
        const xdgPluginOverrideDir = mockPath.join(xdgBaseDir, pluginName);
        const xdgPluginOverrideFilePath = mockPath.join(xdgPluginOverrideDir, `${pluginName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);

        const layer0ConfigData = {
            rawConfig: { initialSetting: 'base' },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        // Configure loader properties
        loader.xdgBaseDir = xdgBaseDir;
        loader.xdgMainConfig = {}; // Ensure no inline XDG override
        loader.projectMainConfig = {}; // Ensure no project overrides

        // Explicitly tell existsSync to return false for the expected path
        mockFs.existsSync.withArgs(xdgPluginOverrideFilePath).returns(false);

        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions:
        // ExistsSync should be called exactly once and with the specific path
        expect(mockFs.existsSync.calledOnceWith(xdgPluginOverrideFilePath)).to.be.true;
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // Should not attempt to load
        expect(mockConfigUtils.deepMerge.notCalled).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;

        // No warning is logged by the current code for this specific scenario
        expect(consoleWarnStub.notCalled).to.be.true;

        expect(result.contributingPaths).to.deep.equal(['/path/to/base.config.yaml']);
        expect(result.mergedConfig).to.deep.equal(layer0ConfigData.rawConfig);
        expect(result.mergedCssPaths).to.deep.equal(layer0ConfigData.resolvedCssPaths);
    });

    it('should gracefully handle non-existent project-specific plugin config file by skipping it and logging warnings', async () => {
        const pluginName = 'non-existent-project-plugin';
        const projectBaseDir = '/mock/project/root';
        const projectOverrideRelPath = 'configs/non-existent-project-plugin.config.yaml';
        // Dynamically construct the path that the loader will actually generate
        const projectOverrideAbsPath = mockPath.resolve(projectBaseDir, projectOverrideRelPath);

        const layer0ConfigData = {
            rawConfig: { initialSetting: 'base' },
            resolvedCssPaths: ['/initial/base.css'],
            inherit_css: false,
            actualPath: '/path/to/base.config.yaml',
        };
        const contributingPaths = ['/path/to/base.config.yaml'];

        // Configure loader properties
        loader.projectBaseDir = projectBaseDir;
        loader.projectMainConfig = { plugins: { [pluginName]: projectOverrideRelPath } };
        loader.xdgMainConfig = {}; // Ensure no XDG overrides

        // Mock existsSync for both XDG and Project paths.
        // XDG check will happen first. It won't be explicitly mocked, so it will return `undefined` from the stub, which JS treats as falsy.
        // The project path check will be explicitly mocked.
        mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(false);

        mockPath.isAbsolute.withArgs(projectOverrideRelPath).returns(false); // Simulate a relative path
        mockPath.resolve.withArgs(projectBaseDir, projectOverrideRelPath).returns(projectOverrideAbsPath);

        const result = await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

        // Assertions
        // Expect existsSync to have been called twice: once for XDG file (returns undefined/falsy), once for Project file (returns false).
        expect(mockFs.existsSync.callCount).to.equal(2);
        // Ensure the second call (project file check) was called with the correct path and returned false.
        expect(mockFs.existsSync.getCall(1).calledWith(projectOverrideAbsPath)).to.be.true;
        expect(mockFs.existsSync.getCall(1).returned(false)).to.be.true;

        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // Should not attempt to load
        expect(mockConfigUtils.deepMerge.notCalled).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;

        expect(consoleWarnStub.calledOnce).to.be.true; // Only one warning for this specific scenario
        expect(consoleWarnStub.calledWithMatch(`WARN (PluginConfigLoader): Project-specific settings override for plugin '${pluginName}' in project main config points to non-existent file: '${projectOverrideRelPath}' (resolved to '${projectOverrideAbsPath}')`)).to.be.true;

        // Verify that contributingPaths remains unchanged beyond layer0
        expect(result.contributingPaths).to.deep.equal(['/path/to/base.config.yaml']);
        expect(result.mergedConfig).to.deep.equal(layer0ConfigData.rawConfig);
        expect(result.mergedCssPaths).to.deep.equal(layer0ConfigData.resolvedCssPaths);
    });
});
