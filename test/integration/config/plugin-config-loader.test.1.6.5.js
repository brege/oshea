// test/integration/config/plugin-config-loader.test.1.6.5.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require(pluginConfigLoaderPath);

describe('PluginConfigLoader _loadSingleConfigLayer (1.6.5)', () => {
  let mockFs;
  let mockPath;
  let mockOs;
  let mockConfigUtils;
  let mockAssetResolver;
  let loader;
  let consoleErrorStub;

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

    // Stub console.error to capture errors
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore(); // Restore all stubs, including console.error
  });

  it('should handle errors during YAML parsing or file reading gracefully, returning an empty config object', async () => {
    const configFilePath = '/path/to/bad-plugin/bad.config.yaml';
    const assetsBasePath = '/path/to/bad-plugin';
    const pluginName = 'bad-plugin';
    const errorMessage = 'Failed to parse YAML: unexpected token';

    // Configure mocks to simulate a file existing but failing to load/parse
    mockFs.existsSync.withArgs(configFilePath).returns(true);
    mockConfigUtils.loadYamlConfig.withArgs(configFilePath).rejects(new Error(errorMessage));

    const result = await loader._loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName);

    // Assertions
    expect(mockFs.existsSync.calledOnceWith(configFilePath)).to.be.true; // Should check if file exists
    expect(mockConfigUtils.loadYamlConfig.calledOnceWith(configFilePath)).to.be.true; // Should attempt to load YAML
    expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true; // AssetResolver should not be called if config loading fails

    expect(consoleErrorStub.calledOnce).to.be.true; // Should log an error
    expect(consoleErrorStub.calledWithMatch(`ERROR (PluginConfigLoader): loading plugin configuration layer from '${configFilePath}' for ${pluginName}: ${errorMessage}`)).to.be.true;

    expect(result).to.deep.equal({
      rawConfig: {},
      resolvedCssPaths: [],
      inherit_css: false,
      actualPath: null,
    });

    // Verify cache is NOT populated for failed loads
    const cacheKey = `${configFilePath}-${assetsBasePath}`;
    expect(loader._rawPluginYamlCache[cacheKey]).to.be.undefined;
  });
});
