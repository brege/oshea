// test/integration/config/plugin-config-loader.test.js
const { pluginConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const { logs, clearLogs } = require('../../shared/capture-logs');
const proxyquire = require('proxyquire');

const allPaths = require('@paths');
const testLoggerPath = path.resolve(__dirname, '../../shared/capture-logs.js');

const constructorManifest = require('./plugin-config-loader.constructor.manifest.js');
const loadSingleLayerManifest = require('./plugin-config-loader.load-single-layer.manifest.js');
const applyOverridesManifest = require('./plugin-config-loader.apply-overrides.manifest.js');

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

describe('PluginConfigLoader (Integration Tests)', function() {
  let mockDependencies;
  let PluginConfigLoader;

  beforeEach(function() {
    clearLogs();

    mockDependencies = {
      fs: { existsSync: sinon.stub() },
      path: { ...path },
      os: { homedir: sinon.stub().returns('/fake/home') },
      configUtils: {
        loadYamlConfig: sinon.stub(),
        deepMerge: sinon.stub(),
        isObject: sinon.stub(),
      },
      AssetResolver: { resolveAndMergeCss: sinon.stub() },
      logger: require('../../shared/capture-logs.js'),
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

