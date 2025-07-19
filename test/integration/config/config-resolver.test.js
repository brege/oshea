// test/integration/config/config-resolver.test.js
require('module-alias/register');
const {
  configResolverPath,
  captureLogsPath,
  configResolverConstructorManifestPath,
  configResolverInitializeManifestPath,
  configResolverLoadPluginBaseConfigManifestPath,
  configResolverGetEffectiveConfigManifestPath,
  allPaths,
  testLoggerPath
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const { logs, clearLogs } = require(captureLogsPath);
const proxyquire = require('proxyquire');
const nodePath = require('path');
const _ = require('lodash');

const constructorManifest = require(configResolverConstructorManifestPath);
const initializeManifest = require(configResolverInitializeManifestPath);
const loadPluginBaseConfigManifest = require(configResolverLoadPluginBaseConfigManifestPath);
const getEffectiveConfigManifest = require(configResolverGetEffectiveConfigManifestPath);

const allTestCases = [
  ...constructorManifest,
  ...initializeManifest,
  ...loadPluginBaseConfigManifest,
  ...getEffectiveConfigManifest,
];

describe('ConfigResolver (Integration Tests)', function () {
  let mockDependencies;
  let mockMainConfigLoaderInstance;
  let mockPluginConfigLoaderInstance;
  let ConfigResolver;

  beforeEach(function () {
    clearLogs();

    mockMainConfigLoaderInstance = {
      getPrimaryMainConfig: sinon.stub(),
      getXdgMainConfig: sinon.stub(),
      getProjectManifestConfig: sinon.stub(),
    };

    mockPluginConfigLoaderInstance = {
      _rawPluginYamlCache: {},
      applyOverrideLayers: sinon.stub().resolves({
        mergedConfig: { handler_script: 'index.js' },
        mergedCssPaths: [],
      }),
    };

    const MockMainConfigLoader = sinon.stub().returns(mockMainConfigLoaderInstance);
    const MockPluginConfigLoader = sinon.stub().returns(mockPluginConfigLoaderInstance);
    const MockPluginRegistryBuilder = sinon.stub().returns({ buildRegistry: sinon.stub().resolves({}) });

    mockDependencies = {
      MainConfigLoader: MockMainConfigLoader,
      PluginConfigLoader: MockPluginConfigLoader,
      PluginRegistryBuilder: MockPluginRegistryBuilder,
      fs: {
        existsSync: sinon.stub().returns(true),
        readFileSync: sinon.stub().returns('{}'),
        statSync: sinon.stub().returns({ isFile: () => true, isDirectory: () => false }),
      },
      path: { ...nodePath },
      os: { homedir: sinon.stub().returns('/fake/home') },
      loadYamlConfig: sinon.stub().resolves({ handler_script: 'index.js' }),
      deepMerge: (a, b) => ({ ...a, ...b }),
      AssetResolver: {
        resolveAndMergeCss: sinon.stub().returns([]),
      },
    };

    ConfigResolver = proxyquire(configResolverPath, {
      '@paths': { ...allPaths, loggerPath: testLoggerPath },
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  allTestCases.forEach((testCase) => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      setup,
      assert,
      isNegativeTest,
      expectedErrorMessage,
      useImperativeSetup,
      ...scenarioConfig
    } = testCase;

    it_(description, async function () {
      const mocks = { mockDependencies, mockMainConfigLoaderInstance, mockPluginConfigLoaderInstance };
      const constants = {};

      let resolver = new ConfigResolver(null, false, false, mockDependencies);

      if (setup) {
        await setup(mocks, constants, resolver, scenarioConfig);
      }

      if (useImperativeSetup) {
        if (scenarioConfig.mainConfigStubs) {
          if (scenarioConfig.mainConfigStubs.getPrimaryMainConfig) {
            mocks.mockMainConfigLoaderInstance.getPrimaryMainConfig.resolves(scenarioConfig.mainConfigStubs.getPrimaryMainConfig);
          }
          if (scenarioConfig.mainConfigStubs.getXdgMainConfig) {
            mocks.mockMainConfigLoaderInstance.getXdgMainConfig.resolves(scenarioConfig.mainConfigStubs.getXdgMainConfig);
          }
          if (scenarioConfig.mainConfigStubs.getProjectManifestConfig) {
            mocks.mockMainConfigLoaderInstance.getProjectManifestConfig.resolves(scenarioConfig.mainConfigStubs.getProjectManifestConfig);
          }
        }
        await resolver._initializeResolverIfNeeded();

        if (scenarioConfig.registryStubs) {
          resolver.mergedPluginRegistry = _.cloneDeep(scenarioConfig.registryStubs);
        }
        if (scenarioConfig.pluginConfigLoaderStubs) {
          resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves(
              scenarioConfig.pluginConfigLoaderStubs.applyOverrideLayers
            )
          };
        }
        if (scenarioConfig.baseConfigStubs) {
          sinon.stub(resolver, '_loadPluginBaseConfig').resolves(scenarioConfig.baseConfigStubs);
        }
        if (scenarioConfig.primaryMainConfig) {
          resolver.primaryMainConfig = scenarioConfig.primaryMainConfig;
        }
      } else {
        // Manifest/factory-driven: do normal setup/init
        if (!isNegativeTest) {
          if (
            !scenarioConfig.mainConfigStubs ||
            !scenarioConfig.mainConfigStubs.getPrimaryMainConfig
          ) {
            mocks.mockMainConfigLoaderInstance.getPrimaryMainConfig.resolves({ config: {}, path: null, baseDir: null });
          }
          if (
            !scenarioConfig.mainConfigStubs ||
            !scenarioConfig.mainConfigStubs.getXdgMainConfig
          ) {
            mocks.mockMainConfigLoaderInstance.getXdgMainConfig.resolves({ config: {}, path: null, baseDir: null });
          }
          if (
            !scenarioConfig.mainConfigStubs ||
            !scenarioConfig.mainConfigStubs.getProjectManifestConfig
          ) {
            mocks.mockMainConfigLoaderInstance.getProjectManifestConfig.resolves({ config: {}, path: null, baseDir: null });
          }
          await resolver._initializeResolverIfNeeded();
        }
      }

      if (isNegativeTest) {
        try {
          await resolver.getEffectiveConfig(
            scenarioConfig.pluginSpec,
            scenarioConfig.localConfigOverrides,
            scenarioConfig.markdownFilePath
          );
          throw new Error('Expected an error to be thrown, but it was not.');
        } catch (error) {
          expect(error).to.be.an.instanceOf(Error);
          expect(error.message).to.match(expectedErrorMessage);
        }
        return;
      }

      if (assert) {
        await assert(resolver, mocks, constants, expect, logs, scenarioConfig);
      }
    });
  });
});

