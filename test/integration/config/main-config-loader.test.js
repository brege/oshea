// test/integration/config/main-config-loader.test.js
const { mainConfigLoaderPath, defaultConfigPath, factoryDefaultConfigPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const { logs, testLogger, clearLogs } = require('../../shared/capture-logs');
const proxyquire = require('proxyquire');

const allPaths = require('@paths');
const constructorManifest = require('./main-config-loader.constructor.manifest.js');
const initializeManifest = require('./main-config-loader.initialize.manifest.js');
const gettersManifest = require('./main-config-loader.getters.manifest.js');

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

describe('MainConfigLoader (Integration Tests)', function() {
  let mockDependencies;
  let MainConfigLoader;

  beforeEach(function() {
    clearLogs();

    mockDependencies = {
      fs: {
        existsSync: sinon.stub(),
        readFile: sinon.stub().resolves(''),
      },
      path: { ...path }, // Use a mutable copy of the real path module
      os: {
        homedir: sinon.stub().returns(commonTestConstants.MOCK_OS_HOME_DIR),
        platform: sinon.stub().returns('linux'),
      },
      loadYamlConfig: sinon.stub().resolves({}),
      process: { env: {} },
    };

    MainConfigLoader = proxyquire(mainConfigLoaderPath, {
      '@paths': { ...allPaths, logger: testLogger },
      os: mockDependencies.os,
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
      isNegativeTest,
      expectedErrorMessage,
      ...scenarioConfig
    } = testCase;

    it_(description, async function() {
      const mocks = { mockDependencies };

      if (setup) {
        await setup(mocks, commonTestConstants, scenarioConfig);
      }

      if (isNegativeTest) {
        expect(() => new MainConfigLoader(...scenarioConfig.constructorArgs, mocks.mockDependencies))
          .to.throw(expectedErrorMessage);
        return;
      }

      const loader = new MainConfigLoader(...scenarioConfig.constructorArgs, mocks.mockDependencies);

      if (assert) {
        await assert(loader, mocks, commonTestConstants, expect, logs);
      }
    });
  });
});
