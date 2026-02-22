// test/runners/integration/collections/collections-manager.enable-disable.manifest.js
require('module-alias/register');
const { collectionsManagerFactoryPath } = require('@paths');
const { makeCollectionsManagerScenario } = require(
  collectionsManagerFactoryPath,
);

const FAKE_PLUGIN_ID = 'my-plugin';
const FAKE_COLLECTION = 'test-collection';
const FAKE_CONFIG_PATH =
  '/fake/collRoot/test-collection/my-plugin/my-plugin.config.yaml';

module.exports = [
  makeCollectionsManagerScenario({
    description:
      '2.1.17: should successfully add a valid plugin to the enabled manifest',
    methodName: 'enablePlugin',
    methodArgs: [
      `${FAKE_COLLECTION}/${FAKE_PLUGIN_ID}`,
      { bypassValidation: true },
    ],
    stubs: {
      fss: { existsSync: { returns: true } },
      internal: {
        listAvailablePlugins: {
          resolves: [
            {
              plugin_id: FAKE_PLUGIN_ID,
              collection: FAKE_COLLECTION,
              config_path: FAKE_CONFIG_PATH,
            },
          ],
        },
        _readEnabledManifest: { resolves: { enabled_plugins: [] } },
        _writeEnabledManifest: { resolves: true },
      },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result.success).to.be.true;
      expect(mocks._writeEnabledManifest.calledOnce).to.be.true;
      const manifestWritten = mocks._writeEnabledManifest.firstCall.args[0];
      const newEntry = manifestWritten.enabled_plugins[0];
      expect(newEntry.invoke_name).to.equal(FAKE_PLUGIN_ID);
      expect(newEntry.config_path).to.equal(FAKE_CONFIG_PATH);
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.18: should prevent enabling a plugin if the invoke_name already exists',
    methodName: 'enablePlugin',
    methodArgs: [
      `${FAKE_COLLECTION}/${FAKE_PLUGIN_ID}`,
      { bypassValidation: true },
    ],
    isNegativeTest: true,
    expectedErrorMessage: /is already in use/,
    stubs: {
      fss: { existsSync: { returns: true } },
      internal: {
        listAvailablePlugins: {
          resolves: [
            {
              plugin_id: FAKE_PLUGIN_ID,
              collection: FAKE_COLLECTION,
              config_path: FAKE_CONFIG_PATH,
            },
          ],
        },
        _readEnabledManifest: {
          resolves: { enabled_plugins: [{ invoke_name: FAKE_PLUGIN_ID }] },
        },
      },
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.19: should throw an error when trying to enable a non-existent plugin',
    methodName: 'enablePlugin',
    methodArgs: [`${FAKE_COLLECTION}/non-existent-plugin`],
    isNegativeTest: true,
    expectedErrorMessage: /is not available or does not exist/,
    stubs: {
      internal: {
        listAvailablePlugins: {
          resolves: [
            { plugin_id: 'some-other-plugin', collection: FAKE_COLLECTION },
          ],
        },
      },
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.20: should throw an error for an invalid invoke_name format',
    methodName: 'enablePlugin',
    methodArgs: [
      `${FAKE_COLLECTION}/${FAKE_PLUGIN_ID}`,
      { name: 'invalid name!', bypassValidation: true },
    ],
    isNegativeTest: true,
    expectedErrorMessage: /Invalid invoke_name/,
    stubs: {
      fss: { existsSync: { returns: true } },
      internal: {
        listAvailablePlugins: {
          resolves: [
            {
              plugin_id: FAKE_PLUGIN_ID,
              collection: FAKE_COLLECTION,
              config_path: FAKE_CONFIG_PATH,
            },
          ],
        },
      },
    },
  }),

  makeCollectionsManagerScenario({
    description:
      "2.1.21: should throw an error if the plugin's config path does not exist",
    methodName: 'enablePlugin',
    methodArgs: [`${FAKE_COLLECTION}/${FAKE_PLUGIN_ID}`],
    isNegativeTest: true,
    expectedErrorMessage: /is invalid or not found/,
    stubs: {
      fss: { existsSync: { returns: false } },
      internal: {
        listAvailablePlugins: {
          resolves: [
            {
              plugin_id: FAKE_PLUGIN_ID,
              collection: FAKE_COLLECTION,
              config_path: '/path/to/non-existent.config.yaml',
            },
          ],
        },
      },
    },
  }),
];
