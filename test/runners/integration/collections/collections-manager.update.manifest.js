// test/runners/integration/collections/collections-manager.update.manifest.js
require('module-alias/register');
const { collectionsManagerFactoryPath } = require('@paths');
const { makeCollectionsManagerScenario } = require(
  collectionsManagerFactoryPath,
);
const sinon = require('sinon');

const COLLECTION_TO_UPDATE = 'my-git-collection';

module.exports = [
  makeCollectionsManagerScenario({
    description:
      '2.1.10: should successfully pull updates for a clean Git-sourced collection',
    methodName: 'updateCollection',
    methodArgs: [COLLECTION_TO_UPDATE],
    useImperativeSetup: true,
    imperativeSetup: (manager, mocks, sinon) => {
      // Pre-manager: stub collection exists
      if (!manager && mocks.mockDependencies && mocks.mockDependencies.fss) {
        mocks.mockDependencies.fss.existsSync.returns(true);
        return;
      }
      // Post-manager: stub internals
      if (manager) {
        mocks._readCollectionMetadata = sinon
          .stub(manager, '_readCollectionMetadata')
          .resolves({
            source: 'https://github.com/fake/repo.git',
          });
        mocks._writeCollectionMetadata = sinon
          .stub(manager, '_writeCollectionMetadata')
          .resolves();
        mocks._spawnGitProcess = sinon.stub(manager, '_spawnGitProcess');
        mocks._spawnGitProcess
          .withArgs(
            ['remote', 'show', 'origin'],
            sinon.match.any,
            sinon.match.any,
          )
          .resolves({ success: true, stdout: 'HEAD branch: main' });
        mocks._spawnGitProcess
          .withArgs(['fetch', 'origin'], sinon.match.any, sinon.match.any)
          .resolves({ success: true, stdout: '' });
        mocks._spawnGitProcess
          .withArgs(['status', '--porcelain'], sinon.match.any, sinon.match.any)
          .resolves({ success: true, stdout: '' });
        mocks._spawnGitProcess
          .withArgs(
            ['rev-list', '--count', 'origin/main..HEAD'],
            sinon.match.any,
            sinon.match.any,
          )
          .resolves({ success: true, stdout: '0' });
        mocks._spawnGitProcess
          .withArgs(
            ['reset', '--hard', 'origin/main'],
            sinon.match.any,
            sinon.match.any,
          )
          .resolves({ success: true });
      }
    },
    assertion: (result, mocks) => {
      expect(result.success).to.be.true;
      expect(
        mocks._spawnGitProcess.calledWith(['reset', '--hard', 'origin/main']),
      ).to.be.true;
      expect(mocks._writeCollectionMetadata.calledOnce).to.be.true;
      expect(mocks._writeCollectionMetadata.firstCall.args[1]).to.have.property(
        'updated_on',
      );
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.11: should gracefully handle updating a non-existent collection',
    methodName: 'updateCollection',
    methodArgs: ['non-existent-collection'],
    stubs: {
      fss: { existsSync: { returns: false } },
    },
    assertion: (result, mocks) => {
      expect(result.success).to.be.false;
      expect(result.message).to.equal(
        'Collection "non-existent-collection" not found.',
      );
      expect(
        mocks._readCollectionMetadata && mocks._readCollectionMetadata.called,
      ).to.not.be.true;
    },
  }),

  makeCollectionsManagerScenario({
    description:
      '2.1.12: should abort the update if the collection has local changes',
    methodName: 'updateCollection',
    methodArgs: ['dirty-collection'],
    useImperativeSetup: true,
    imperativeSetup: (manager, mocks, sinon) => {
      // Pre-manager: stub collection exists
      if (!manager && mocks.mockDependencies && mocks.mockDependencies.fss) {
        mocks.mockDependencies.fss.existsSync.returns(true);
        return;
      }
      // Post-manager: stub internals
      if (manager) {
        mocks._readCollectionMetadata = sinon
          .stub(manager, '_readCollectionMetadata')
          .resolves({
            source: 'https://github.com/fake/repo.git',
          });
        mocks._writeCollectionMetadata = sinon
          .stub(manager, '_writeCollectionMetadata')
          .resolves();
        mocks._spawnGitProcess = sinon.stub(manager, '_spawnGitProcess');
        mocks._spawnGitProcess
          .withArgs(
            ['remote', 'show', 'origin'],
            sinon.match.any,
            sinon.match.any,
          )
          .resolves({ success: true, stdout: 'HEAD branch: main' });
        mocks._spawnGitProcess
          .withArgs(['fetch', 'origin'], sinon.match.any, sinon.match.any)
          .resolves({ success: true });
        mocks._spawnGitProcess
          .withArgs(['status', '--porcelain'], sinon.match.any, sinon.match.any)
          .resolves({ success: true, stdout: ' M some-file.js' });
      }
    },
    assertion: (result, mocks) => {
      expect(result.success).to.be.false;
      expect(result.message).to.contain('has local changes. Aborting update.');
      expect(
        mocks._spawnGitProcess.calledWith(
          sinon.match.array.startsWith(['reset']),
        ),
      ).to.be.false;
    },
  }),
];
