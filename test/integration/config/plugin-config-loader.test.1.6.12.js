// test/integration/config/plugin-config-loader.test.1.6.12.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require(pluginConfigLoaderPath);

describe('PluginConfigLoader applyOverrideLayers (1.6.12)', () => {
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
      isObject: sinon.stub().returns(false), // Default to false for inline overrides
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

  it('should correctly resolve relative paths within project file-based overrides', async () => {
    const pluginName = 'path-res-plugin';
    const projectBaseDir = '/mock/project/root';
    const projectOverrideRelPath = 'configs/path-res-plugin.config.yaml';
    const projectOverrideAbsPath = `${projectBaseDir}/configs/path-res-plugin.config.yaml`;
    const projectOverrideAssetBase = `${projectBaseDir}/configs`;

    const layer0ConfigData = {
      rawConfig: {},
      resolvedCssPaths: [],
      inherit_css: false,
      actualPath: '/path/to/base.config.yaml',
    };
    const contributingPaths = [];

    // Configure loader properties
    loader.projectBaseDir = projectBaseDir;
    loader.projectMainConfig = { plugins: { [pluginName]: projectOverrideRelPath } };

    // Configure mocks
    mockFs.existsSync.returns(false); // No XDG file, no XDG inline
    mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(true); // Project file exists

    mockConfigUtils.loadYamlConfig.resolves({}); // No specific config content needed for this path test
    mockConfigUtils.deepMerge.returns({});
    mockAssetResolver.resolveAndMergeCss.returns([]);

    mockPath.isAbsolute.withArgs(projectOverrideRelPath).returns(false); // It's a relative path
    mockPath.resolve.withArgs(projectBaseDir, projectOverrideRelPath).returns(projectOverrideAbsPath);
    mockPath.dirname.withArgs(projectOverrideAbsPath).returns(projectOverrideAssetBase);

    await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

    // Assertions for path resolution
    expect(mockPath.isAbsolute.calledWith(projectOverrideRelPath)).to.be.true;
    expect(mockPath.resolve.calledWith(projectBaseDir, projectOverrideRelPath)).to.be.true;
    expect(mockPath.dirname.calledWith(projectOverrideAbsPath)).to.be.true;

    // Verify loadYamlConfig and AssetResolver were called with the resolved absolute path
    expect(mockConfigUtils.loadYamlConfig.calledWith(projectOverrideAbsPath)).to.be.true;
    expect(mockAssetResolver.resolveAndMergeCss.calledWith(
      sinon.match.any, // css_files
      projectOverrideAssetBase, // assetsBasePath
      sinon.match.any, // currentCssPaths
      sinon.match.any, // inherit_css
      sinon.match.any, // pluginName
      projectOverrideAbsPath // configFilePath
    )).to.be.true;
  });

  it('should correctly resolve tilde-prefixed paths within project file-based overrides', async () => {
    const pluginName = 'tilde-path-plugin';
    const homeDir = '/home/user';
    const projectOverrideTildePath = '~/configs/tilde-path-plugin.config.yaml';
    const projectOverrideAbsPath = `${homeDir}/configs/tilde-path-plugin.config.yaml`;
    const projectOverrideAssetBase = `${homeDir}/configs`;

    const layer0ConfigData = {
      rawConfig: {},
      resolvedCssPaths: [],
      inherit_css: false,
      actualPath: '/path/to/base.config.yaml',
    };
    const contributingPaths = [];

    // Configure loader properties
    loader.projectBaseDir = '/mock/project/root'; // projectBaseDir is still relevant for resolve()
    loader.projectMainConfig = { plugins: { [pluginName]: projectOverrideTildePath } };

    // Configure mocks
    mockFs.existsSync.returns(false); // No XDG file, no XDG inline
    mockFs.existsSync.withArgs(projectOverrideAbsPath).returns(true); // Project file exists

    mockConfigUtils.loadYamlConfig.resolves({});
    mockConfigUtils.deepMerge.returns({});
    mockAssetResolver.resolveAndMergeCss.returns([]);

    mockOs.homedir.returns(homeDir); // Mock os.homedir
    mockPath.join.withArgs(homeDir, 'configs/tilde-path-plugin.config.yaml').returns(projectOverrideAbsPath);
    mockPath.dirname.withArgs(projectOverrideAbsPath).returns(projectOverrideAssetBase);

    await loader.applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths);

    // Assertions for path resolution
    expect(mockOs.homedir.calledOnce).to.be.true;
    expect(mockPath.join.calledWith(homeDir, 'configs/tilde-path-plugin.config.yaml')).to.be.true;
    expect(mockPath.dirname.calledWith(projectOverrideAbsPath)).to.be.true;

    // Verify loadYamlConfig and AssetResolver were called with the resolved absolute path
    expect(mockConfigUtils.loadYamlConfig.calledWith(projectOverrideAbsPath)).to.be.true;
    expect(mockAssetResolver.resolveAndMergeCss.calledWith(
      sinon.match.any, // css_files
      projectOverrideAssetBase, // assetsBasePath
      sinon.match.any, // currentCssPaths
      sinon.match.any, // inherit_css
      sinon.match.any, // pluginName
      projectOverrideAbsPath // configFilePath
    )).to.be.true;
  });
});
