// test/runners/integration/collections/collections-manager.factory.js

function makeCollectionsManagerScenario({
  description,
  methodName,
  methodArgs = [],
  managerOptions = {},
  isNegativeTest = false,
  expectedErrorMessage = null,
  stubs = {},
  assertion,
  useImperativeSetup = false,
  imperativeSetup = null,
}) {
  const setup = (mocks) => {
    const { mockDependencies } = mocks;

    if (stubs.fss) {
      for (const [func, behavior] of Object.entries(stubs.fss)) {
        if (behavior.returns !== undefined) mockDependencies.fss[func].returns(behavior.returns);
        if (behavior.withArgs) {
          for (const [args, returns] of Object.entries(behavior.withArgs)) {
            mockDependencies.fss[func].withArgs(...JSON.parse(args)).returns(returns);
          }
        }
      }
    }

    if (stubs.fs) {
      for (const [func, behavior] of Object.entries(stubs.fs)) {
        if (behavior.resolves !== undefined) mockDependencies.fs[func].resolves(behavior.resolves);
        if (behavior.rejects !== undefined) mockDependencies.fs[func].rejects(new Error(behavior.rejects));
      }
    }

    if (stubs.fsExtra) {
      for (const [func, behavior] of Object.entries(stubs.fsExtra)) {
        if (behavior.rejects) {
          mockDependencies.fsExtra[func].rejects(new Error(behavior.rejects));
        } else {
          mockDependencies.fsExtra[func].resolves();
        }
      }
    }

    if (stubs.cmUtils) {
      for (const [func, returns] of Object.entries(stubs.cmUtils)) {
        mockDependencies.cmUtils[func].returns(returns);
      }
    }
  };

  const assert = async (result, mocks, constants, expect, logs) => {
    if (assertion) {
      await assertion(result, mocks, constants, expect, logs);
    }
  };

  return {
    description,
    methodName,
    methodArgs,
    managerOptions,
    isNegativeTest,
    expectedErrorMessage,
    stubs,
    setup,
    assert,
    useImperativeSetup,
    imperativeSetup,
  };
}

module.exports = { makeCollectionsManagerScenario };
