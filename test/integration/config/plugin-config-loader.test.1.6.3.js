// test/integration/config/plugin-config-loader.test.1.6.3.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require(pluginConfigLoaderPath); // Path to the refactored module

describe('PluginConfigLoader _loadSingleConfigLayer (1.6.3)', () => {
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
  });

  afterEach(() => {
    sinon.restore(); // Restore all stubs after each test
  });

  it('should cache loaded config data and return the cached result on subsequent calls with the same parameters', async () => {
    const configFilePath = '/path/to/plugin/cached-plugin.config.yaml';
    const assetsBasePath = '/path/to/plugin';
    const pluginName = 'cached-plugin';
    const rawConfigContent = {
      css_files: ['cached.css'],
      inherit_css: false,
      someSetting: 'cachedValue',
    };
    const expectedResolvedCssPaths = ['/resolved/cached.css'];

    // Configure mocks for the first call
    mockFs.existsSync.withArgs(configFilePath).returns(true);
    mockConfigUtils.loadYamlConfig.withArgs(configFilePath).resolves(rawConfigContent);
    mockAssetResolver.resolveAndMergeCss.withArgs(
      rawConfigContent.css_files,
      assetsBasePath,
      [],
      false,
      pluginName,
      configFilePath
    ).returns(expectedResolvedCssPaths);

    // First call: Should load from file and populate cache
    const result1 = await loader._loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName);

    // Assertions for the first call
    expect(mockFs.existsSync.calledOnceWith(configFilePath)).to.be.true;
    expect(mockConfigUtils.loadYamlConfig.calledOnceWith(configFilePath)).to.be.true;
    expect(mockAssetResolver.resolveAndMergeCss.calledOnce).to.be.true;
    expect(result1).to.deep.equal({
      rawConfig: rawConfigContent,
      resolvedCssPaths: expectedResolvedCssPaths,
      inherit_css: rawConfigContent.inherit_css,
      actualPath: configFilePath,
    });

    // Reset history to verify no new calls on the second invocation
    mockFs.existsSync.resetHistory();
    mockConfigUtils.loadYamlConfig.resetHistory();
    mockAssetResolver.resolveAndMergeCss.resetHistory();

    // Second call: Should return from cache, without calling fs, configUtils, or AssetResolver again
    const result2 = await loader._loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName);

    // Assertions for the second call
    expect(mockFs.existsSync.notCalled).to.be.true; // Should not be called again
    expect(mockConfigUtils.loadYamlConfig.notCalled).to.be.true; // Should not be called again
    expect(mockAssetResolver.resolveAndMergeCss.notCalled).to.be.true; // Should not be called again
    expect(result2).to.deep.equal(result1); // Should return the exact same object

    // Verify cache content directly (optional, as previous checks imply it)
    expect(loader._rawPluginYamlCache[`${configFilePath}-${assetsBasePath}`]).to.deep.equal(result1);
  });
});
