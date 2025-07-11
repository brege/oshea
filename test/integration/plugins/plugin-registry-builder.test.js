// test/integration/plugins/plugin-registry-builder.test.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');

const { logs, clearLogs } = require('../../shared/capture-logs');

const constructorManifest = require('./plugin-registry-builder.constructor.manifest');
const resolveAliasManifest = require('./plugin-registry-builder.resolve-alias.manifest');
const resolvePluginConfigPathManifest = require('./plugin-registry-builder.resolve-plugin-config-path.manifest');
const getPluginRegistrationsFromFileManifest = require('./plugin-registry-builder.get-plugin-registrations-from-file.manifest');
const cmManifestsManifest = require('./plugin-registry-builder.cm-manifests.manifest');
const buildRegistryManifest = require('./plugin-registry-builder.build-registry.manifest');
const getAllPluginDetailsManifest = require('./plugin-registry-builder.get-all-plugin-details.manifest');

const getTestCases = (manifest) => {
  if (Array.isArray(manifest)) {
    return manifest;
  }
  if (manifest && Array.isArray(manifest.tests)) {
    return manifest.tests;
  }
  throw new Error(`Invalid manifest format: ${JSON.stringify(manifest)}`);
};

const allTestCases = [
  ...getTestCases(constructorManifest),
  ...getTestCases(resolveAliasManifest),
  ...getTestCases(resolvePluginConfigPathManifest),
  ...getTestCases(getPluginRegistrationsFromFileManifest),
  ...getTestCases(cmManifestsManifest),
  ...getTestCases(buildRegistryManifest),
  ...getTestCases(getAllPluginDetailsManifest),
];

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
  DUMMY_MARKDOWN_FILENAME: 'my-document.md',
};

describe('PluginRegistryBuilder (Integration Tests)', function() {

  let mockDependencies;
  let originalPathsModule;
  let PluginRegistryBuilder;

  beforeEach(function() {
    clearLogs();

    const pathsPath = require.resolve('@paths');
    originalPathsModule = require.cache[pathsPath];
    delete require.cache[pluginRegistryBuilderPath];
    delete require.cache[pathsPath];

    // Inject loggerPath for log capturing
    const testLoggerPath = path.resolve(__dirname, '../../shared/capture-logs.js');
    require.cache[pathsPath] = {
      exports: {
        ...require(pathsPath),
        loggerPath: testLoggerPath
      }
    };

    mockDependencies = {
      fs: {
        existsSync: sinon.stub().returns(true),
        promises: { readFile: sinon.stub().resolves(''), readdir: sinon.stub().resolves([]) },
        statSync: sinon.stub().returns({ isDirectory: () => true, isFile: () => true }),
        readdir: sinon.stub().resolves([]),
        readdirSync: sinon.stub().returns([])
      },
      os: {
        homedir: sinon.stub().returns(commonTestConstants.FAKE_HOME_DIR),
        platform: sinon.stub().returns('linux')
      },
      path: {
        join: sinon.stub().callsFake((...args) => require('path').join(...args)),
        dirname: sinon.stub().callsFake((...args) => require('path').dirname(...args)),
        resolve: sinon.stub().callsFake((...args) => require('path').resolve(...args)),
        isAbsolute: sinon.stub().callsFake((p) => require('path').isAbsolute(p)),
        basename: sinon.stub().callsFake((p) => require('path').basename(p)),
        extname: sinon.stub().callsFake((p) => require('path').extname(p)),
      },
      process: { env: {} },
      loadYamlConfig: sinon.stub(),
      yaml: { load: sinon.stub() },
      collRoot: commonTestConstants.FAKE_COLL_ROOT,
      // logger: testLogger // REMOVE this line, use loggerPath above
    };

    mockDependencies.fsPromises = {
      readFile: sinon.stub().resolves(''),
    };

    PluginRegistryBuilder = require(pluginRegistryBuilderPath);
  });

  afterEach(function() {
    if (originalPathsModule) {
      require.cache[require.resolve('@paths')] = originalPathsModule;
    }
    sinon.restore();
  });

  allTestCases.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(`${testCase.description}`, async function() {
      const currentMocks = {
        mockDependencies
      };

      let builderInstance;

      if (testCase.isNegativeTest) {
        expect(() => {
          if (testCase.setup) {
            testCase.setup(currentMocks, commonTestConstants);
          }
          const constructorArgsToUse = testCase.constructorArgs || [
            commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null
          ];
          new PluginRegistryBuilder(...constructorArgsToUse, currentMocks.mockDependencies);
        }).to.throw(testCase.expectedErrorMessage);
      } else {

        if (testCase.setup && !testCase.methodName) {
          await testCase.setup(currentMocks, commonTestConstants);
        }

        const constructorArgsForCurrentTest = testCase.constructorArgs || [
          commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null
        ];
        builderInstance = new PluginRegistryBuilder(...constructorArgsForCurrentTest, currentMocks.mockDependencies);
        currentMocks.builderInstance = builderInstance;

        if (testCase.setup && testCase.methodName) {
          await testCase.setup(currentMocks, commonTestConstants);
        }

        if (testCase.methodName && typeof testCase.methodName === 'string') {
          if (currentMocks.mockDependencies.os.homedir.resetHistory) {
            currentMocks.mockDependencies.os.homedir.resetHistory();
          }
        }

        if (testCase.methodName && typeof testCase.methodName === 'string') {
          const argsToPass = Array.isArray(testCase.methodArgs) ? testCase.methodArgs : [];
          const methodResult = await builderInstance[testCase.methodName](...argsToPass);
          await testCase.assert(methodResult, currentMocks, commonTestConstants, expect, logs);
        } else {
          await testCase.assert(builderInstance, currentMocks, commonTestConstants, expect, logs);
        }
      }
    });
  });
});

