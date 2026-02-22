// test/runners/integration/collections/collections-manager.disable.manifest.js
require('module-alias/register');
const { collectionsManagerFactoryPath } = require('@paths');
const { makeCollectionsManagerScenario } = require(
  collectionsManagerFactoryPath,
);

const PLUGIN_TO_DISABLE = 'my-enabled-plugin';
const FAKE_ENABLED_PLUGINS = [
  { invoke_name: PLUGIN_TO_DISABLE, collection_name: 'test-collection' },
  { invoke_name: 'another-plugin', collection_name: 'another-collection' },
];

module.exports = [
  makeCollectionsManagerScenario({
    description:
      '2.1.22: should successfully remove a plugin from the enabled manifest',
    methodName: 'disablePlugin',
    methodArgs: [PLUGIN_TO_DISABLE],
    stubs: {
      internal: {
        _readEnabledManifest: {
          resolves: { enabled_plugins: FAKE_ENABLED_PLUGINS },
        },
        _writeEnabledManifest: { resolves: true },
      },
    },
    assertion: (result, mocks, _constants, expect) => {
      expect(result.success).to.be.true;
      expect(mocks._writeEnabledManifest.calledOnce).to.be.true;
      const manifestWritten = mocks._writeEnabledManifest.firstCall.args[0];
      expect(manifestWritten.enabled_plugins).to.have.lengthOf(1);
      expect(manifestWritten.enabled_plugins[0].invoke_name).to.equal(
        'another-plugin',
      );
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.23: should gracefully handle attempts to disable a non-existent invokeName',
    methodName: 'disablePlugin',
    methodArgs: ['non-existent-plugin'],
    isNegativeTest: true,
    expectedErrorMessage:
      /Plugin with invoke_name "non-existent-plugin" not found/,
    stubs: {
      internal: {
        _readEnabledManifest: {
          resolves: { enabled_plugins: FAKE_ENABLED_PLUGINS },
        },
      },
    },
  }),
];
