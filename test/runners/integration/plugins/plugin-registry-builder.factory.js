// test/runners/integration/plugins/plugin-registry-builder.factory.js
const path = require('path');
const sinon = require('sinon');

function makeCmManifestScenario({
  enabledPlugins,
  configPathsExist = {},
  expectResult,
  expectLogs,
}) {
  return {
    setup: async ({ mockDependencies }) => {
      const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
      const fakeParsedData = { enabled_plugins: enabledPlugins };

      mockDependencies.fs.existsSync.withArgs(FAKE_MANIFEST_PATH).returns(true);

      for (const [configPath, exists] of Object.entries(configPathsExist)) {
        mockDependencies.fs.existsSync.withArgs(configPath).returns(exists);
      }

      mockDependencies.fsPromises.readFile
        .withArgs(FAKE_MANIFEST_PATH)
        .resolves('');
      mockDependencies.yaml.load.withArgs('').returns(fakeParsedData);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      const finalResult = {};
      for (const key in result) {
        finalResult[key] = {
          configPath: result[key].configPath,
          sourceType: result[key].sourceType.split(' ')[0],
          definedIn: result[key].definedIn,
        };
      }
      expect(finalResult).to.deep.equal(expectResult);
      expectLogs.forEach((expected, index) => {
        expect(
          logs.some((log) => {
            if (typeof expected === 'string') {
              return log.msg.includes(expected);
            } else if (expected instanceof RegExp) {
              return expected.test(log.msg);
            }
            return false;
          }),
        ).to.be.true;
      });
    },
  };
}

function makeFileRegistrationScenario({
  mainConfigPath,
  yamlContent,
  yamlError,
  resolvedPaths = {},
  fileSystem = {},
  expectResult,
  expectLogs = [],
}) {
  return {
    setup: async ({ mockDependencies }) => {
      if (yamlContent === null) {
        mockDependencies.fs.existsSync.withArgs(mainConfigPath).returns(false);
        return;
      }

      mockDependencies.fs.existsSync.withArgs(mainConfigPath).returns(true);

      if (yamlError) {
        mockDependencies.loadYamlConfig
          .withArgs(mainConfigPath)
          .rejects(yamlError);
      } else {
        mockDependencies.loadYamlConfig
          .withArgs(mainConfigPath)
          .resolves(yamlContent);
      }

      for (const [raw, resolved] of Object.entries(resolvedPaths)) {
        mockDependencies.path.resolve
          .withArgs(path.dirname(mainConfigPath), raw)
          .returns(resolved);
      }

      for (const [filePath, stat] of Object.entries(fileSystem)) {
        mockDependencies.fs.existsSync.withArgs(filePath).returns(stat.exists);
        mockDependencies.fs.statSync.withArgs(filePath).returns({
          isFile: () => !!stat.isFile,
          isDirectory: () => !!stat.isDir,
        });
        if (stat.readdir) {
          mockDependencies.fs.readdirSync
            .withArgs(filePath)
            .returns(stat.readdir);
        }
        if (stat.isFile) {
          mockDependencies.path.basename
            .withArgs(filePath)
            .returns(path.basename(filePath));
        }
      }
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal(expectResult);
      expectLogs.forEach((expected, index) => {
        expect(
          logs.some((log) => {
            if (typeof expected === 'string') {
              return log.msg.includes(expected);
            } else if (expected instanceof RegExp) {
              return expected.test(log.msg);
            }
            return false;
          }),
        ).to.be.true;
      });
    },
  };
}

function makeBuildRegistryScenario({ registryStubs = {}, assertion }) {
  return {
    setup: async ({ builderInstance }) => {
      const {
        _registerBundledPlugins = {},
        _getPluginRegistrationsFromCmManifest = {},
        _getPluginRegistrationsFromFile = {},
      } = registryStubs;

      sinon
        .stub(builderInstance, '_registerBundledPlugins')
        .resolves(_registerBundledPlugins);
      sinon
        .stub(builderInstance, '_getPluginRegistrationsFromCmManifest')
        .resolves(_getPluginRegistrationsFromCmManifest);
      sinon
        .stub(builderInstance, '_getPluginRegistrationsFromFile')
        .resolves(_getPluginRegistrationsFromFile);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await assertion(result, mocks, constants, expect, logs);
    },
  };
}

function makeGetAllPluginDetailsScenario({
  buildRegistryResult,
  cmAvailablePlugins = [],
  cmEnabledPlugins = [],
  setup = async () => {},
  assertion,
}) {
  return {
    constructorArgs: [
      '/fake/project',
      null,
      null,
      false,
      false,
      null,
      {
        listAvailablePlugins: sinon.stub().resolves(cmAvailablePlugins),
        listCollections: sinon
          .stub()
          .withArgs('enabled')
          .resolves(cmEnabledPlugins),
      },
    ],
    setup: async (mocks) => {
      sinon
        .stub(mocks.builderInstance, 'buildRegistry')
        .resolves(buildRegistryResult);
      mocks.mockDependencies.fs.existsSync.returns(true);
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true });
      await setup(mocks);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await assertion(result, mocks, constants, expect, logs);
    },
  };
}

function makeCacheInvalidationScenario({
  description,
  changedConstructorArgs,
}) {
  return {
    description,
    methodName: 'buildRegistry',
    constructorArgs: [
      '/fake/project',
      null,
      null,
      false,
      false,
      'initial',
      null,
    ],
    setup: async ({ builderInstance, mockDependencies }) => {
      builderInstance.buildRegistrySpy = sinon.spy(
        builderInstance,
        '_registerBundledPlugins',
      );
      await builderInstance.buildRegistry();
      const BuilderClass = builderInstance.constructor;
      builderInstance.newInstance = new BuilderClass(
        ...changedConstructorArgs,
        mockDependencies,
      );
      builderInstance.newSpy = sinon.spy(
        builderInstance.newInstance,
        '_registerBundledPlugins',
      );
    },
    assert: async (result, { builderInstance }, constants, expect) => {
      await builderInstance.newInstance.buildRegistry();
      expect(builderInstance.buildRegistrySpy.callCount).to.equal(1);
      expect(builderInstance.newSpy.callCount).to.equal(1);
    },
  };
}

function makeResolveAliasScenario({
  methodArgs,
  pathMocks = {},
  expectResult,
  expectLogs = [],
  expectHomedirCall = false,
}) {
  return {
    methodArgs,
    setup: async ({ mockDependencies }) => {
      if (pathMocks.isAbsolute !== undefined) {
        mockDependencies.path.isAbsolute.returns(pathMocks.isAbsolute);
      }
      if (pathMocks.resolve !== undefined) {
        mockDependencies.path.resolve.returns(pathMocks.resolve);
      }
    },
    assert: async (result, { mockDependencies }, constants, expect, logs) => {
      expect(result).to.equal(expectResult);
      if (expectHomedirCall) {
        expect(mockDependencies.os.homedir.calledOnce).to.be.true;
      }
      if (expectLogs && expectLogs.length > 0) {
        expectLogs.forEach((expectedLogPattern) => {
          expect(
            logs.some((actualLog) =>
              typeof expectedLogPattern === 'string'
                ? actualLog.msg.includes(expectedLogPattern)
                : expectedLogPattern.test(actualLog.msg),
            ),
          ).to.be.true;
        });
      } else {
        expect(logs.length).to.be.greaterThan(0);
        expect(logs.some((log) => log.level === 'debug')).to.be.true;
      }
    },
  };
}

function makeResolveConfigPathScenario({
  methodArgs,
  fileSystem = {},
  expectResult,
  expectHomedirCall = false,
  expectLogs = [],
}) {
  return {
    methodArgs,
    setup: async ({ mockDependencies }, { FAKE_HOME_DIR }) => {
      for (const [filePath, stat] of Object.entries(fileSystem)) {
        const resolvedPath = filePath.startsWith('~')
          ? path.join(FAKE_HOME_DIR, filePath.slice(1))
          : filePath;

        mockDependencies.fs.existsSync
          .withArgs(resolvedPath)
          .returns(stat.exists);
        if (stat.exists) {
          mockDependencies.fs.statSync.withArgs(resolvedPath).returns({
            isFile: () => !!stat.isFile,
            isDirectory: () => !!stat.isDir,
          });
        }
      }
    },
    assert: async (result, { mockDependencies }, constants, expect, logs) => {
      expect(result).to.equal(expectResult);
      if (expectHomedirCall) {
        expect(mockDependencies.os.homedir.calledOnce).to.be.true;
      }
      if (expectLogs && expectLogs.length > 0) {
        expectLogs.forEach((expectedLogPattern) => {
          expect(
            logs.some((actualLog) =>
              typeof expectedLogPattern === 'string'
                ? actualLog.msg.includes(expectedLogPattern)
                : expectedLogPattern.test(actualLog.msg),
            ),
          ).to.be.true;
        });
      } else {
        expect(logs.length).to.be.greaterThan(0);
        expect(logs.some((log) => log.level === 'debug')).to.be.true;
      }
    },
  };
}

module.exports = {
  makeCmManifestScenario,
  makeFileRegistrationScenario,
  makeBuildRegistryScenario,
  makeGetAllPluginDetailsScenario,
  makeCacheInvalidationScenario,
  makeResolveAliasScenario,
  makeResolveConfigPathScenario,
};
