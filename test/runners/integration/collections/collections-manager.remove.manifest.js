// test/runners/integration/collections/collections-manager.remove.manifest.js
require('module-alias/register');
const { collectionsManagerFactoryPath } = require('@paths');
const { makeCollectionsManagerScenario } = require(
  collectionsManagerFactoryPath,
);

const COLLECTION_TO_REMOVE = 'my-collection';

module.exports = [
  makeCollectionsManagerScenario({
    description:
      '2.1.7: should throw an error if the collection has enabled plugins and --force is not used',
    methodName: 'removeCollection',
    methodArgs: [COLLECTION_TO_REMOVE],
    isNegativeTest: true,
    expectedErrorMessage:
      /has enabled plugins[\s\S]*disable them first[\s\S]*--force/,
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true } },
      },
      internal: {
        _readEnabledManifest: {
          resolves: {
            enabled_plugins: [{ collection_name: COLLECTION_TO_REMOVE }],
          },
        },
      },
    },
    assertion: (result, mocks) => {
      expect(
        mocks.disableAllPluginsFromCollection &&
          mocks.disableAllPluginsFromCollection.called,
      ).to.not.be.true;
      expect(mocks.mockDependencies.fsExtra.rm.called).to.be.false;
    },
  }),
  makeCollectionsManagerScenario({
    description:
      '2.1.7: should remove a collection and disable its plugins when --force is used',
    methodName: 'removeCollection',
    methodArgs: [COLLECTION_TO_REMOVE, { force: true }],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true } },
      },
      fsExtra: { rm: { resolves: true } },
      internal: {
        _readEnabledManifest: {
          resolves: {
            enabled_plugins: [{ collection_name: COLLECTION_TO_REMOVE }],
          },
        },
        disableAllPluginsFromCollection: { resolves: true },
      },
    },
    assertion: (result, mocks, constants) => {
      const { FAKE_COLL_ROOT } = constants;
      expect(result.success).to.be.true;
      expect(
        mocks.disableAllPluginsFromCollection.calledWith(COLLECTION_TO_REMOVE),
      ).to.be.true;
      expect(
        mocks.mockDependencies.fsExtra.rm.calledWith(
          `${FAKE_COLL_ROOT}/${COLLECTION_TO_REMOVE}`,
        ),
      ).to.be.true;
    },
  }),
  makeCollectionsManagerScenario({
    description:
      '2.1.8: should handle attempts to remove a non-existent collection gracefully',
    methodName: 'removeCollection',
    methodArgs: ['non-existent-collection'],
    stubs: {
      fss: { existsSync: { returns: false } },
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: [] } },
      },
    },
    assertion: (result, mocks) => {
      expect(result.success).to.be.true;
      expect(mocks.mockDependencies.fsExtra.rm.called).to.be.false;
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.9: should throw an error if the directory deletion fails',
    methodName: 'removeCollection',
    methodArgs: [COLLECTION_TO_REMOVE],
    isNegativeTest: true,
    expectedErrorMessage: 'EPERM: permission denied',
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true } },
      },
      fsExtra: { rm: { rejects: 'EPERM: permission denied' } },
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: [] } },
      },
    },
    assertion: (result, mocks) => {
      expect(mocks.mockDependencies.fsExtra.rm.called).to.be.true;
    },
  }),
];
