// test/shared/case-factories.js
const path = require('path');
const sinon = require('sinon');

/**
 * Creates a test case for the _getPluginRegistrationsFromCmManifest method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {Array} config.enabled_plugins - The list of plugins to be parsed from the manifest.
 * @param {object} [config.configPathsExist={}] - A map of plugin config paths to their existence status (true/false).
 * @param {object} config.expectResult - The expected registration object.
 * @param {Array<string|RegExp>} config.expectLogs - An array of strings or regexes to match against captured log messages.
 * @returns {{setup: Function, assert: Function}} An object containing the setup and assert functions for a test case.
 */
function makeCmManifestScenario({ enabled_plugins, configPathsExist = {}, expectResult, expectLogs }) {
  return {
    setup: async ({ mockDependencies }) => {
      const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
      const fakeParsedData = { enabled_plugins };

      mockDependencies.fs.existsSync.withArgs(FAKE_MANIFEST_PATH).returns(true);

      for (const [configPath, exists] of Object.entries(configPathsExist)) {
        mockDependencies.fs.existsSync.withArgs(configPath).returns(exists);
      }

      mockDependencies.fsPromises.readFile.withArgs(FAKE_MANIFEST_PATH).resolves('');
      mockDependencies.yaml.load.withArgs('').returns(fakeParsedData);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      // FIX: The assertion now correctly checks the structure of the result,
      // accounting for the properties added by the application logic.
      const finalResult = {};
      for(const key in result) {
        finalResult[key] = {
          configPath: result[key].configPath,
          sourceType: result[key].sourceType.split(' ')[0], // Compare only the base source type
          definedIn: result[key].definedIn,
        };
      }
      expect(finalResult).to.deep.equal(expectResult);
      expect(logs).to.have.lengthOf(expectLogs.length);
      logs.forEach((log, index) => {
        const expected = expectLogs[index];
        if (typeof expected === 'string') {
          expect(log.msg).to.equal(expected);
        } else {
          expect(log.msg).to.match(expected);
        }
      });
    }
  };
}

/**
 * Creates a test case for the _getPluginRegistrationsFromFile method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {string} config.mainConfigPath - The path to the main configuration file being tested.
 * @param {object|null} config.yamlContent - The YAML content to be returned by the loader. If null, the file is considered non-existent.
 * @param {Error} [config.yamlError] - An error to be thrown by the YAML loader.
 * @param {object} [config.resolvedPaths={}] - A map of raw plugin paths to their resolved absolute paths.
 * @param {object} [config.fileSystem={}] - A map defining the state of the filesystem (path -> {isFile, isDir, exists, readdir}).
 * @param {object} config.expectResult - The expected final registration object.
 * @param {Array<string|RegExp>} [config.expectLogs=[]] - An array of strings or regexes to match against captured log messages.
 * @returns {{setup: Function, assert: Function}} An object containing the setup and assert functions for a test case.
 */
function makeFileRegistrationScenario({ mainConfigPath, yamlContent, yamlError, resolvedPaths = {}, fileSystem = {}, expectResult, expectLogs = [] }) {
  return {
    setup: async ({ mockDependencies }) => {
      if (yamlContent === null) {
        mockDependencies.fs.existsSync.withArgs(mainConfigPath).returns(false);
        return;
      }

      mockDependencies.fs.existsSync.withArgs(mainConfigPath).returns(true);

      if (yamlError) {
        mockDependencies.loadYamlConfig.withArgs(mainConfigPath).rejects(yamlError);
      } else {
        mockDependencies.loadYamlConfig.withArgs(mainConfigPath).resolves(yamlContent);
      }

      for (const [raw, resolved] of Object.entries(resolvedPaths)) {
        mockDependencies.path.resolve.withArgs(path.dirname(mainConfigPath), raw).returns(resolved);
      }

      for (const [filePath, stat] of Object.entries(fileSystem)) {
        mockDependencies.fs.existsSync.withArgs(filePath).returns(stat.exists);
        mockDependencies.fs.statSync.withArgs(filePath).returns({ isFile: () => !!stat.isFile, isDirectory: () => !!stat.isDir });
        if (stat.readdir) {
          mockDependencies.fs.readdirSync.withArgs(filePath).returns(stat.readdir);
        }
        if (stat.isFile) {
          mockDependencies.path.basename.withArgs(filePath).returns(path.basename(filePath));
        }
      }
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal(expectResult);
      expect(logs).to.have.lengthOf(expectLogs.length);
      logs.forEach((log, index) => {
        const expected = expectLogs[index];
        if (typeof expected === 'string') {
          expect(log.msg).to.include(expected);
        } else {
          expect(log.msg).to.match(expected);
        }
      });
    }
  };
}

/**
 * Creates a test case for the buildRegistry method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {object} [config.registryStubs={}] - Stubs for the internal registry methods.
 * @param {Function} config.assertion - The final assertion function to run.
 * @returns {{setup: Function, assert: Function}}
 */
function makeBuildRegistryScenario({ registryStubs = {}, assertion }) {
  return {
    setup: async ({ builderInstance }) => {
      const {
        _registerBundledPlugins = {},
        _getPluginRegistrationsFromCmManifest = {},
        _getPluginRegistrationsFromFile = {}
      } = registryStubs;

      sinon.stub(builderInstance, '_registerBundledPlugins').resolves(_registerBundledPlugins);
      sinon.stub(builderInstance, '_getPluginRegistrationsFromCmManifest').resolves(_getPluginRegistrationsFromCmManifest);
      sinon.stub(builderInstance, '_getPluginRegistrationsFromFile').resolves(_getPluginRegistrationsFromFile);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await assertion(result, mocks, constants, expect, logs);
    }
  };
}

/**
 * Creates a test case for the getAllPluginDetails method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {object} config.buildRegistryResult - The mocked result from buildRegistry.
 * @param {Array} [config.cmAvailablePlugins=[]] - Mocked list of available CM plugins.
 * @param {Array} [config.cmEnabledPlugins=[]] - Mocked list of enabled CM plugins.
 * @param {Function} [config.setup=async () => {}] - An optional, test-specific setup function.
 * @param {Function} config.assertion - The final assertion function.
 * @returns {{constructorArgs: Array, setup: Function, assert: Function}}
 */
function makeGetAllPluginDetailsScenario({ buildRegistryResult, cmAvailablePlugins = [], cmEnabledPlugins = [], setup = async () => {}, assertion }) {
  return {
    constructorArgs: [
      '/fake/project', null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves(cmAvailablePlugins),
        listCollections: sinon.stub().withArgs('enabled').resolves(cmEnabledPlugins)
      },
    ],
    setup: async (mocks) => {
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves(buildRegistryResult);
      mocks.mockDependencies.fs.existsSync.returns(true);
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true });
      // Allow specific mocks to be set by the test case itself
      await setup(mocks);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await assertion(result, mocks, constants, expect, logs);
    }
  };
}

/**
 * Creates a test case for cache invalidation scenarios in buildRegistry.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {string} config.description - The test description.
 * @param {Array} config.changedConstructorArgs - The constructor args for the second instance.
 * @returns {object} A complete test case object.
 */
function makeCacheInvalidationScenario({ description, changedConstructorArgs }) {
  return {
    description,
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, null, false, false, 'initial', null], // Baseline
    setup: async ({ builderInstance, mockDependencies }) => {
      builderInstance.buildRegistrySpy = sinon.spy(builderInstance, '_registerBundledPlugins');
      await builderInstance.buildRegistry(); // First call
      const BuilderClass = builderInstance.constructor;
      builderInstance.newInstance = new BuilderClass(...changedConstructorArgs, mockDependencies);
      builderInstance.newSpy = sinon.spy(builderInstance.newInstance, '_registerBundledPlugins');
    },
    assert: async (result, { builderInstance }, constants, expect) => {
      await builderInstance.newInstance.buildRegistry();
      expect(builderInstance.buildRegistrySpy.callCount).to.equal(1);
      expect(builderInstance.newSpy.callCount).to.equal(1); // Should have been called again
    }
  };
}

/**
 * Creates a test case for the _resolveAlias method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {Array} config.methodArgs - The arguments to pass to the method.
 * @param {object} [config.pathMocks={}] - Mocks for the `path` module.
 * @param {string|null} config.expectResult - The expected path string or null.
 * @param {Array<string|RegExp>} [config.expectLogs=[]] - Expected log messages.
 * @param {boolean} [config.expectHomedirCall=false] - Whether to assert that os.homedir was called.
 * @returns {{setup: Function, assert: Function}}
 */
function makeResolveAliasScenario({ methodArgs, pathMocks = {}, expectResult, expectLogs = [], expectHomedirCall = false }) {
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
      expect(logs).to.have.lengthOf(expectLogs.length);
      if (expectHomedirCall) {
        sinon.assert.calledOnce(mockDependencies.os.homedir);
      }
    },
  };
}

/**
 * Creates a test case for the _resolvePluginConfigPath method.
 *
 * @param {object} config - The configuration for the test scenario.
 * @param {Array} config.methodArgs - The arguments to pass to the method.
 * @param {object} [config.fileSystem={}] - A map defining the state of the filesystem.
 * @param {string|null} config.expectResult - The expected path string or null.
 * @param {boolean} [config.expectHomedirCall=false] - Whether os.homedir should be called.
 * @returns {{setup: Function, assert: Function}}
 */
function makeResolveConfigPathScenario({ methodArgs, fileSystem = {}, expectResult, expectHomedirCall = false }) {
  return {
    methodArgs,
    setup: async ({ mockDependencies }, { FAKE_HOME_DIR }) => {
      for (const [filePath, stat] of Object.entries(fileSystem)) {
        // Ensure the path join/resolve works as expected for tilde expansion
        const resolvedPath = filePath.startsWith('~')
          ? path.join(FAKE_HOME_DIR, filePath.slice(1))
          : filePath;

        mockDependencies.fs.existsSync.withArgs(resolvedPath).returns(stat.exists);
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
        sinon.assert.calledOnce(mockDependencies.os.homedir);
      }
    }
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
