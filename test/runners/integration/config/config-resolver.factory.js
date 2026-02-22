// test/runners/integration/config/config-resolver.factory.js

function makeConfigResolverScenario({
  description,
  constructorArgs,
  isNegativeTest,
  expectedErrorMessage,
  useImperativeSetup,
  mainConfigStubs = {},
  expectations,
  assertion, // discouraged; only for rare, complex cases
}) {
  // Setup function: apply main config stubs
  const setup = async (mocks, _constants, _resolver) => {
    const { mockMainConfigLoaderInstance } = mocks;
    if (mainConfigStubs.getPrimaryMainConfig) {
      mockMainConfigLoaderInstance.getPrimaryMainConfig.resolves(
        mainConfigStubs.getPrimaryMainConfig,
      );
    }
    if (mainConfigStubs.getXdgMainConfig) {
      mockMainConfigLoaderInstance.getXdgMainConfig.resolves(
        mainConfigStubs.getXdgMainConfig,
      );
    }
    if (mainConfigStubs.getProjectManifestConfig) {
      mockMainConfigLoaderInstance.getProjectManifestConfig.resolves(
        mainConfigStubs.getProjectManifestConfig,
      );
    }
  };

  // Assertion function: check all expectations
  const factoryAssert = async (result, mocks, constants, expect, logs) => {
    if (expectations) {
      const { mockMainConfigLoaderInstance, mockDependencies } = mocks;
      if ('getPrimaryMainConfigCalled' in expectations) {
        expect(
          mockMainConfigLoaderInstance.getPrimaryMainConfig.called,
        ).to.equal(expectations.getPrimaryMainConfigCalled);
      }
      if ('primaryMainConfig' in expectations) {
        expect(result.primaryMainConfig).to.deep.equal(
          expectations.primaryMainConfig,
        );
      }
      if ('primaryMainConfigPathActual' in expectations) {
        expect(result.primaryMainConfigPathActual).to.equal(
          expectations.primaryMainConfigPathActual,
        );
      }
      if ('resolvedCollRoot' in expectations) {
        expect(result.resolvedCollRoot).to.equal(expectations.resolvedCollRoot);
      }
      if ('pluginConfigLoaderCalled' in expectations) {
        expect(mockDependencies.PluginConfigLoader.calledOnce).to.equal(
          expectations.pluginConfigLoaderCalled,
        );
      }
      if ('pluginRegistryBuilderCalled' in expectations) {
        expect(mockDependencies.PluginRegistryBuilder.calledOnce).to.equal(
          expectations.pluginRegistryBuilderCalled,
        );
      }
    }
    if (assertion) {
      await assertion(result, mocks, constants, expect, logs);
    }
  };

  return {
    description,
    constructorArgs,
    isNegativeTest,
    expectedErrorMessage,
    useImperativeSetup,
    setup,
    assert: factoryAssert,
  };
}

module.exports = { makeConfigResolverScenario };
