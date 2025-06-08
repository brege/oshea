// test/plugin-config-loader/plugin-config-loader.test.1.6.2.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../src/plugin_config_loader'); // Path to the refactored module

describe('PluginConfigLoader _loadSingleConfigLayer (1.6.2)', () => {
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
            join: sinon.stub().callsFake((...args) => args.join('/')), // Simple join for testing paths
            isAbsolute: sinon.stub(),
            resolve: sinon.stub().callsFake((base, rel) => `${base}/${rel}`), // Simple resolve
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

        // Initialize PluginConfigLoader with mocks for every test
        loader = new PluginConfigLoader(
            '/mock/xdg/base', {}, '/mock/xdg/config.yaml', '/mock/project/base', {}, '/mock/project/config.yaml', false,
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
        sinon.restore(); // Restore all stubs after each test
    });

    it('should successfully load a valid YAML config file and resolve initial CSS paths using AssetResolver.resolveAndMergeCss', async () => {
        const configFilePath = '/path/to/plugin/my-plugin.config.yaml';
        const assetsBasePath = '/path/to/plugin';
        const pluginName = 'my-plugin';
        const rawConfigContent = {
            css_files: ['main.css', 'theme.css'],
            inherit_css: true,
            someSetting: 'value',
        };
        const expectedResolvedCssPaths = ['/resolved/main.css', '/resolved/theme.css'];

        // Configure mocks for this specific test case
        mockFs.existsSync.withArgs(configFilePath).returns(true);
        mockConfigUtils.loadYamlConfig.withArgs(configFilePath).resolves(rawConfigContent);
        mockAssetResolver.resolveAndMergeCss.withArgs(
            rawConfigContent.css_files,
            assetsBasePath,
            [], // initialCssPaths is always empty for the first layer in _loadSingleConfigLayer
            false, // inherit_css for initial resolution in _loadSingleConfigLayer is always false
            pluginName,
            configFilePath
        ).returns(expectedResolvedCssPaths);

        const result = await loader._loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName);

        // Assertions
        expect(mockFs.existsSync.calledOnceWith(configFilePath)).to.be.true;
        expect(mockConfigUtils.loadYamlConfig.calledOnceWith(configFilePath)).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.calledOnce).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[0]).to.deep.equal(rawConfigContent.css_files);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[1]).to.equal(assetsBasePath);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[2]).to.deep.equal([]);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[3]).to.be.false;
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[4]).to.equal(pluginName);
        expect(mockAssetResolver.resolveAndMergeCss.getCall(0).args[5]).to.equal(configFilePath);


        expect(result).to.deep.equal({
            rawConfig: rawConfigContent,
            resolvedCssPaths: expectedResolvedCssPaths,
            inherit_css: rawConfigContent.inherit_css,
            actualPath: configFilePath,
        });

        // Verify cache was populated
        expect(loader._rawPluginYamlCache[`${configFilePath}-${assetsBasePath}`]).to.deep.equal(result);
    });
});
