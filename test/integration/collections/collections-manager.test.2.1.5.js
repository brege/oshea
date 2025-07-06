// test/integration/collections/collections-manager.test.2.1.5.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.5
describe('CollectionsManager addCollection Error Handling (2.1.5)', () => {

  const FAKE_COLL_ROOT = '/fake/collRoot';
  const DERIVED_COLLECTION_NAME = 'repo';
  const FAKE_COLLECTION_PATH = `${FAKE_COLL_ROOT}/${DERIVED_COLLECTION_NAME}`;

  let mockDependencies;
  let manager;
  let writeMetaStub;

  beforeEach(() => {
    mockDependencies = {
      fss: { existsSync: sinon.stub() },
      fs: { mkdir: sinon.stub().resolves() },
      fsExtra: { copy: sinon.stub() },
      path: {
        join: (a, b) => `${a}/${b}`,
        resolve: p => `/resolved/${p}`
      },
      cmUtils: { deriveCollectionName: sinon.stub().returns(DERIVED_COLLECTION_NAME) },
      chalk: {
        blue: str => str, yellow: str => str, red: str => str,
        magenta: str => str, underline: str => str, green: str => str,
      }
    };

    manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

    // Stub the metadata method, which shouldn't be called in case of failure
    writeMetaStub = sinon.stub(manager, '_writeCollectionMetadata');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error when cloning from an invalid Git URL', async () => {
    // Arrange
    const gitUrl = 'https://github.com/fake/invalid-repo.git';
    const gitError = new Error('Git clone failed');

    // Simulate that the target directory does not exist yet
    mockDependencies.fss.existsSync.returns(false);

    // Stub the git process to fail
    const spawnGitStub = sinon.stub(manager, '_spawnGitProcess').rejects(gitError);

    // Act & Assert
    try {
      await manager.addCollection(gitUrl);
      expect.fail('Expected addCollection to throw an error for a bad git clone.');
    } catch (error) {
      expect(error).to.equal(gitError);
    }

    // Verify no metadata was written
    expect(writeMetaStub.called).to.be.false;
    // Verify a clone was attempted
    expect(spawnGitStub.called).to.be.true;
  });

  it('should throw an error for a non-existent local source path', async () => {
    // Arrange
    const localPath = './non-existent-dir';
    const resolvedPath = `/resolved/${localPath}`;

    // Simulate target does not exist, but source also does not exist
    mockDependencies.fss.existsSync.withArgs(FAKE_COLLECTION_PATH).returns(false);
    mockDependencies.fss.existsSync.withArgs(resolvedPath).returns(false);

    // Git process should not be called for a local path
    const spawnGitStub = sinon.stub(manager, '_spawnGitProcess');

    // Act & Assert
    try {
      await manager.addCollection(localPath);
      expect.fail('Expected addCollection to throw an error for a missing local path.');
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(`Local source path does not exist: ${resolvedPath}`);
    }

    // Verify git was not called, and no metadata was written
    expect(spawnGitStub.called).to.be.false;
    expect(writeMetaStub.called).to.be.false;
  });
});
