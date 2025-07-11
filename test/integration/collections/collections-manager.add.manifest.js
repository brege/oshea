// test/integration/collections/collections-manager.add.manifest.js
const { makeCollectionsManagerScenario } = require('./collections-manager.factory');
const sinon = require('sinon');

const FAKE_REPO_URL = 'https://github.com/fake/repo.git';
const DERIVED_COLLECTION_NAME = 'repo';

module.exports = [
  makeCollectionsManagerScenario({
    description: '2.1.3: should successfully clone a git repository and write metadata',
    methodName: 'addCollection',
    methodArgs: [FAKE_REPO_URL],
    stubs: {
      fss: { existsSync: { returns: false } },
      fs: { mkdir: { resolves: true } },
      cmUtils: { deriveCollectionName: DERIVED_COLLECTION_NAME },
      internal: {
        _spawnGitProcess: { resolves: { success: true } },
        _writeCollectionMetadata: { resolves: true },
      },
    },
    assertion: (result, mocks, constants, expect) => {
      const { FAKE_COLL_ROOT } = constants;
      const expectedPath = `${FAKE_COLL_ROOT}/${DERIVED_COLLECTION_NAME}`;
      expect(result).to.equal(expectedPath);
      expect(mocks.mockDependencies.fs.mkdir.calledWith(FAKE_COLL_ROOT, { recursive: true })).to.be.true;
      expect(mocks._spawnGitProcess.calledWith(['clone', FAKE_REPO_URL, expectedPath])).to.be.true;
      expect(mocks._writeCollectionMetadata.calledWith(DERIVED_COLLECTION_NAME, sinon.match({ source: FAKE_REPO_URL }))).to.be.true;
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.4: should throw an error if the target collection directory already exists',
    methodName: 'addCollection',
    methodArgs: [FAKE_REPO_URL],
    isNegativeTest: true,
    expectedErrorMessage: /Target directory '.*' already exists/,
    stubs: {
      fss: { existsSync: { returns: true } },
      cmUtils: { deriveCollectionName: DERIVED_COLLECTION_NAME },
    },
    assertion: (result, mocks) => {
      expect(mocks._spawnGitProcess && mocks._spawnGitProcess.called).to.not.be.true;
      expect(mocks._writeCollectionMetadata && mocks._writeCollectionMetadata.called).to.not.be.true;
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.5: should throw an error for a non-existent local source path',
    methodName: 'addCollection',
    methodArgs: ['./non-existent-dir'],
    isNegativeTest: true,
    expectedErrorMessage: /Local source path does not exist/,
    stubs: {
      fss: {
        existsSync: {
          withArgs: { '["/fake/collRoot/non-existent-dir"]': false },
          returns: false
        }
      },
      cmUtils: { deriveCollectionName: 'non-existent-dir' },
    },
    assertion: (result, mocks) => {
      expect(mocks._spawnGitProcess && mocks._spawnGitProcess.called).to.not.be.true;
      expect(mocks._writeCollectionMetadata && mocks._writeCollectionMetadata.called).to.not.be.true;
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.6: should call deriveCollectionName when no name override is provided',
    methodName: 'addCollection',
    methodArgs: [FAKE_REPO_URL],
    stubs: {
      fss: { existsSync: { returns: false } },
      cmUtils: { deriveCollectionName: DERIVED_COLLECTION_NAME },
      internal: { _spawnGitProcess: { resolves: true }, _writeCollectionMetadata: { resolves: true } }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(mocks.mockDependencies.cmUtils.deriveCollectionName.calledWith(FAKE_REPO_URL)).to.be.true;
      // Check the third argument to _spawnGitProcess (the target path)
      expect(mocks._spawnGitProcess.firstCall.args[0][2]).to.include(DERIVED_COLLECTION_NAME);
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.6: should use the provided name override instead of deriving one',
    methodName: 'addCollection',
    methodArgs: [FAKE_REPO_URL, { name: 'my-override-name' }],
    stubs: {
      fss: { existsSync: { returns: false } },
      internal: { _spawnGitProcess: { resolves: true }, _writeCollectionMetadata: { resolves: true } },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(mocks.mockDependencies.cmUtils.deriveCollectionName.called).to.be.false;
      expect(mocks._spawnGitProcess.firstCall.args[0][2]).to.include('my-override-name');
    },
  }),
];

