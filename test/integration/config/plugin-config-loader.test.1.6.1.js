// test/integration/config/plugin-config-loader.test.1.6.1.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginConfigLoader = require(pluginConfigLoaderPath); // Adjust path as needed for project root

describe('PluginConfigLoader constructor (1.6.1)', () => {
  let mockFs;
  let mockPath;
  let mockOs;
  let mockConfigUtils;
  let mockAssetResolver;

  beforeEach(() => {
    // Create mocks for all dependencies
    mockFs = {
      existsSync: sinon.stub(),
    };
    mockPath = {
      join: sinon.stub().callsFake((...args) => args.join('/')), // Simple join for testing paths
      isAbsolute: sinon.stub(),
      resolve: sinon.stub().callsFake((base, rel) => `${base}/${rel}`), // Simple resolve
      dirname: sinon.stub(),
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
  });

  afterEach(() => {
    sinon.restore(); // Restore all stubs after each test
  });

  it('should correctly initialize xdgBaseDir, xdgMainConfig, xdgMainConfigPath, projectBaseDir, projectMainConfig, projectMainConfigPath, and useFactoryDefaultsOnly from arguments, setting defaults for configs if null/undefined.', () => {
    const xdgBaseDir = '/mock/xdg/base';
    const xdgMainConfig = { xdg: 'config' };
    const xdgMainConfigPath = '/mock/xdg/config.yaml';
    const projectBaseDir = '/mock/project/base';
    const projectMainConfig = { project: 'config' };
    const projectMainConfigPath = '/mock/project/config.yaml';
    const useFactoryDefaultsOnly = false;

    const loader = new PluginConfigLoader(
      xdgBaseDir,
      xdgMainConfig,
      xdgMainConfigPath,
      projectBaseDir,
      projectMainConfig,
      projectMainConfigPath,
      useFactoryDefaultsOnly,
      {
        fs: mockFs,
        path: mockPath,
        os: mockOs,
        configUtils: mockConfigUtils,
        AssetResolver: mockAssetResolver,
      }
    );

    // Assertions for direct property initialization
    expect(loader.xdgBaseDir).to.equal(xdgBaseDir);
    expect(loader.xdgMainConfig).to.deep.equal(xdgMainConfig);
    expect(loader.xdgMainConfigPath).to.equal(xdgMainConfigPath);
    expect(loader.projectBaseDir).to.equal(projectBaseDir);
    expect(loader.projectMainConfig).to.deep.equal(projectMainConfig);
    expect(loader.projectMainConfigPath).to.equal(projectMainConfigPath);
    expect(loader.useFactoryDefaultsOnly).to.equal(useFactoryDefaultsOnly);
    expect(loader._rawPluginYamlCache).to.deep.equal({}); // Should be initialized empty

    // Assertions for injected dependencies
    expect(loader.fs).to.equal(mockFs);
    expect(loader.path).to.equal(mockPath);
    expect(loader.os).to.equal(mockOs);
    expect(loader.configUtils).to.equal(mockConfigUtils);
    expect(loader.AssetResolver).to.equal(mockAssetResolver);
  });

  it('should set xdgMainConfig to an empty object if null or undefined', () => {
    const commonArgs = ['xdgDir', 'xdgPath', 'projDir', {}, 'projPath', false];
    const dependencies = { fs: mockFs, path: mockPath, os: mockOs, configUtils: mockConfigUtils, AssetResolver: mockAssetResolver };

    const loaderNull = new PluginConfigLoader(
      commonArgs[0], null, commonArgs[1], commonArgs[2], commonArgs[3], commonArgs[4], commonArgs[5],
      dependencies
    );
    expect(loaderNull.xdgMainConfig).to.deep.equal({});

    const loaderUndefined = new PluginConfigLoader(
      commonArgs[0], undefined, commonArgs[1], commonArgs[2], commonArgs[3], commonArgs[4], commonArgs[5],
      dependencies
    );
    expect(loaderUndefined.xdgMainConfig).to.deep.equal({});
  });

  it('should set projectMainConfig to an empty object if null or undefined', () => {
    const commonArgs = ['xdgDir', {}, 'xdgPath', 'projDir', 'projPath', false];
    const dependencies = { fs: mockFs, path: mockPath, os: mockOs, configUtils: mockConfigUtils, AssetResolver: mockAssetResolver };

    const loaderNull = new PluginConfigLoader(
      commonArgs[0], commonArgs[1], commonArgs[2], commonArgs[3], null, commonArgs[4], commonArgs[5],
      dependencies
    );
    expect(loaderNull.projectMainConfig).to.deep.equal({});

    const loaderUndefined = new PluginConfigLoader(
      commonArgs[0], commonArgs[1], commonArgs[2], commonArgs[3], undefined, commonArgs[4], commonArgs[5],
      dependencies
    );
    expect(loaderUndefined.projectMainConfig).to.deep.equal({});
  });
});
