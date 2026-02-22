// test/runners/integration/config/main-config-loader.test.js
require('module-alias/register');
const {
  projectRoot,
  mainConfigLoaderPath,
  defaultConfigPath,
  factoryDefaultConfigPath,
  captureLogsPath,
  allPaths,
  mainConfigLoaderConstructorManifestPath,
  mainConfigLoaderInitializeManifestPath,
  mainConfigLoaderGettersManifestPath,
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const { logs, clearLogs } = require(captureLogsPath);
const proxyquire = require('proxyquire');

const testLoggerPath = captureLogsPath;

const constructorManifest = require(mainConfigLoaderConstructorManifestPath);
const initializeManifest = require(mainConfigLoaderInitializeManifestPath);
const gettersManifest = require(mainConfigLoaderGettersManifestPath);

const allTestCases = [
  ...constructorManifest,
  ...initializeManifest,
  ...gettersManifest,
];

const commonTestConstants = {
  TEST_PROJECT_ROOT: '/app/test-root',
  MOCK_OS_HOME_DIR: '/home/testuser',
  DEFAULT_CONFIG_PATH: defaultConfigPath,
  FACTORY_DEFAULT_CONFIG_PATH: factoryDefaultConfigPath,
};

describe(`main-config-loader (Module Integration Tests) ${path.relative(projectRoot, mainConfigLoaderPath)}`, () => {
  let mockDependencies;
  let MainConfigLoader;

  beforeEach(() => {
    clearLogs();

    mockDependencies = {
      fs: {
        existsSync: sinon.stub(),
        readFile: sinon.stub().resolves(''),
      },
      path: { ...require('path') }, // Use a mutable copy of the real path module
      os: {
        homedir: sinon.stub().returns(commonTestConstants.MOCK_OS_HOME_DIR),
        platform: sinon.stub().returns('linux'),
      },
      loadYamlConfig: sinon.stub().resolves({}),
      process: { env: {} },
    };

    MainConfigLoader = proxyquire(mainConfigLoaderPath, {
      '@paths': { ...allPaths, loggerPath: testLoggerPath },
      os: mockDependencies.os,
    });
  });

  afterEach(() => {
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
      ...scenarioConfig
    } = testCase;

    it_(description, async () => {
      const mocks = { mockDependencies };

      if (setup) {
        await setup(mocks, commonTestConstants, scenarioConfig);
      }

      if (isNegativeTest) {
        expect(
          () =>
            new MainConfigLoader(
              ...scenarioConfig.constructorArgs,
              mocks.mockDependencies,
            ),
        ).to.throw(expectedErrorMessage);
        return;
      }

      const loader = new MainConfigLoader(
        ...scenarioConfig.constructorArgs,
        mocks.mockDependencies,
      );

      if (assert) {
        await assert(loader, mocks, commonTestConstants, expect, logs);
      }
    });
  });
});
