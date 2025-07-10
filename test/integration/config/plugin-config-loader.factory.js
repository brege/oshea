// test/integration/config/plugin-config-loader.factory.js
const sinon = require('sinon');

function makePluginConfigLoaderScenario({
  description,
  constructorArgs,
  methodName,
  methodArgs,
  fsExistsStubs = {},
  loadYamlConfigStubs = {},
  assetResolverStubs = {},
  isObjectStubs = {},
  deepMergeStubs = {},
  pathStubs = {},
  osStubs = {},
  assertion,
}) {
  const setup = async (mocks, constants, scenarioConfig) => {
    const { mockDependencies } = mocks;
    for (const [path, returns] of Object.entries(fsExistsStubs)) {
      mockDependencies.fs.existsSync.withArgs(path).returns(returns);
    }
    for (const [path, stubValue] of Object.entries(loadYamlConfigStubs)) {
      if (stubValue instanceof Error) {
        mockDependencies.configUtils.loadYamlConfig.withArgs(path).rejects(stubValue);
      } else {
        mockDependencies.configUtils.loadYamlConfig.withArgs(path).resolves(stubValue);
      }
    }
    for (const [args, returns] of Object.entries(assetResolverStubs)) {
      mockDependencies.AssetResolver.resolveAndMergeCss.withArgs(...JSON.parse(args)).returns(returns);
    }
    for (const [arg, returns] of Object.entries(isObjectStubs)) {
      mockDependencies.configUtils.isObject.withArgs(JSON.parse(arg)).returns(returns);
    }

    mockDependencies.configUtils.deepMerge.callsFake((target, source) => ({...target, ...source}));
    for (const [args, returns] of Object.entries(deepMergeStubs)) {
      mockDependencies.configUtils.deepMerge.withArgs(...JSON.parse(args)).returns(returns);
    }

    for (const [method, stubs] of Object.entries(pathStubs)) {
      if (!mockDependencies.path[method].isSinonProxy) {
        sinon.stub(mockDependencies.path, method);
      }
      for(const [arg, returns] of Object.entries(stubs)) {
        const argArray = arg.includes(',') ? arg.split(',') : [arg];
        mockDependencies.path[method].withArgs(...argArray).returns(returns);
      }
    }
    for (const [method, returns] of Object.entries(osStubs)) {
      mockDependencies.os[method].returns(returns);
    }
  };

  const assert = async (loader, mocks, constants, expect, logs) => {
    if (assertion) {
      if (methodName) {
        const result = await loader[methodName](...methodArgs);
        await assertion(result, loader, mocks, constants, expect, logs);
      } else {
        await assertion(loader, mocks, constants, expect, logs);
      }
    }
  };

  return {
    description,
    constructorArgs,
    methodName,
    methodArgs,
    setup,
    assert,
  };
}

module.exports = { makePluginConfigLoaderScenario };
