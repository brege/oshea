// test/runners/integration/config/main-config-loader.factory.js

function makeMainConfigLoaderScenario({
  description,
  methodName,
  constructorArgs,
  fsExistsStubs,
  loadYamlConfigStubs,
  envStubs,
  isNegativeTest = false,
  expectedErrorMessage,
  assertion,
}) {
  const setup = async (mocks, constants, scenarioConfig) => {
    const { mockDependencies } = mocks;
    mockDependencies.fs.existsSync.returns(false);
    if (fsExistsStubs) {
      for (const [path, returns] of Object.entries(fsExistsStubs)) {
        mockDependencies.fs.existsSync.withArgs(path).returns(returns);
      }
    }
    if (loadYamlConfigStubs) {
      for (const [path, stubValue] of Object.entries(loadYamlConfigStubs)) {
        if (stubValue instanceof Error) {
          mockDependencies.loadYamlConfig.withArgs(path).rejects(stubValue);
        } else {
          mockDependencies.loadYamlConfig.withArgs(path).resolves(stubValue);
        }
      }
    }
    if (envStubs) {
      Object.assign(mockDependencies.process.env, envStubs);
    }
  };

  const assert = async (loader, mocks, constants, expect, logs) => {
    if (assertion) {
      await assertion(loader, mocks, constants, expect, logs);
    }
  };

  return {
    description,
    constructorArgs,
    isNegativeTest,
    expectedErrorMessage,
    setup,
    assert,
  };
}

module.exports = { makeMainConfigLoaderScenario };
