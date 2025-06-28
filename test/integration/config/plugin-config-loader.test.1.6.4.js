// test/integration/config/plugin-config-loader.test.1.6.4.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require('../../../src/config/plugin_config_loader');

describe('PluginConfigLoader _loadSingleConfigLayer (1.6.4)', () => {
    let mockFs;
    let mockPath;
    let mockOs;
    let mockConfigUtils;
    let mockAssetResolver;
    let loader;
    let consoleWarnStub;

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

        // Stub console.warn to capture warnings
        consoleWarnStub = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        sinon.restore(); // Restore all stubs, including console.warn
    });

    it('should return null if configFilePath is null', async () => {
        const assetsBasePath = '/path/to/plugin';
        const pluginName = 'test-plugin';

        const result = await loader._loadSingleConfigLayer(null, assetsBasePath, pluginName);

        // Assertions
        expect(result).to.be.null;
        expect(mockFs.existsSync.notCalled).to.be.true; // Should not call existsSync for null path
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.calledWithMatch(`Config file path not provided or does not exist: null for plugin ${pluginName}.`)).to.be.true;
    });

    it('should return null if configFilePath is undefined', async () => {
        const assetsBasePath = '/path/to/plugin';
        const pluginName = 'test-plugin';

        const result = await loader._loadSingleConfigLayer(undefined, assetsBasePath, pluginName);

        // Assertions
        expect(result).to.be.null;
        expect(mockFs.existsSync.notCalled).to.be.true; // Should not call existsSync for undefined path
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true;
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.calledWithMatch(`Config file path not provided or does not exist: undefined for plugin ${pluginName}.`)).to.be.true;
    });

    it('should return null if the config file does not exist', async () => {
        const configFilePath = '/path/to/non-existent/plugin.config.yaml';
        const assetsBasePath = '/path/to/plugin';
        const pluginName = 'test-plugin';

        // Configure mock to simulate file not existing
        mockFs.existsSync.withArgs(configFilePath).returns(false);

        const result = await loader._loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName);

        // Assertions
        expect(result).to.be.null;
        expect(mockFs.existsSync.calledOnceWith(configFilePath)).to.be.true; // Should call existsSync
        expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // Should not attempt to load YAML
        expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true;
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.calledWithMatch(`Config file path not provided or does not exist: ${configFilePath} for plugin ${pluginName}.`)).to.be.true;
    });
});
