// test/runners/integration/config/plugin-config-loader.test.js
require('module-alias/register');
const {
  projectRoot,
  pluginConfigLoaderPath,
  captureLogsPath,
  allPaths,
  pluginConfigLoaderConstructorManifestPath,
  pluginConfigLoaderLoadSingleLayerManifestPath,
  pluginConfigLoaderApplyOverridesManifestPath
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const { logs, clearLogs } = require(captureLogsPath);
const proxyquire = require('proxyquire');

const testLoggerPath = captureLogsPath;

const constructorManifest = require(pluginConfigLoaderConstructorManifestPath);
const loadSingleLayerManifest = require(pluginConfigLoaderLoadSingleLayerManifestPath);
const applyOverridesManifest = require(pluginConfigLoaderApplyOverridesManifestPath);

const allTestCases = [
  ...constructorManifest,
  ...loadSingleLayerManifest,
  ...applyOverridesManifest,
];

const commonTestConstants = {
  XDG_BASE_DIR: '/mock/xdg/base',
  XDG_MAIN_CONFIG_PATH: '/mock/xdg/config.yaml',
  PROJECT_BASE_DIR: '/mock/project/base',
  PROJECT_MAIN_CONFIG_PATH: '/mock/project/config.yaml',
};

describe(`plugin-config-loader (Module Integration Tests) ${path.relative(projectRoot, pluginConfigLoaderPath)}`, function() {
  let mockDependencies;
  let PluginConfigLoader;

  beforeEach(function() {
    clearLogs();

    mockDependencies = {
      fs: { existsSync: sinon.stub() },
      path: { ...require('path') },
      os: { homedir: sinon.stub().returns('/fake/home') },
      configUtils: {
        loadYamlConfig: sinon.stub(),
        deepMerge: sinon.stub(),
        isObject: sinon.stub(),
      },
      AssetResolver: { resolveAndMergeCss: sinon.stub() },
      logger: require(captureLogsPath),
    };

    PluginConfigLoader = proxyquire(pluginConfigLoaderPath, {
      '@paths': { ...allPaths, loggerPath: testLoggerPath },
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  allTestCases.forEach((testCase) => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      setup,
      assert,
      ...scenarioConfig
    } = testCase;

    it_(description, async function() {
      const mocks = { mockDependencies };

      if (setup) {
        await setup(mocks, commonTestConstants, scenarioConfig);
      }

      const loader = new PluginConfigLoader(...scenarioConfig.constructorArgs, mocks.mockDependencies);

      if (assert) {
        await assert(loader, mocks, commonTestConstants, expect, logs);
      }
    });
  });
});

