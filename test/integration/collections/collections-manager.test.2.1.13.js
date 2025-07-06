// test/integration/collections/collections-manager.test.2.1.13.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.13
describe('CollectionsManager listCollections (2.1.13)', () => {

  const FAKE_COLL_ROOT = '/fake/collRoot';
  let mockDependencies;
  let manager;
  let readMetaStub;
  let readEnabledManifestStub;

  beforeEach(() => {
    mockDependencies = {
      fss: {
        // Simulate the main collection root directory exists
        existsSync: sinon.stub().returns(true)
      },
      fs: {
        // Simulate reading the contents of the collection root
        readdir: sinon.stub().resolves([
          { name: 'collection-a', isDirectory: () => true },
          { name: 'a-file.txt', isDirectory: () => false }, // Should be ignored
          { name: 'collection-b', isDirectory: () => true }
        ])
      },
      path: { join: (a, b) => `${a}/${b}` },
      constants: { USER_ADDED_PLUGINS_DIR_NAME: '_user_added_plugins' },
      chalk: { red: str => str }
    };

    manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

    // Stub methods on the manager instance
    readMetaStub = sinon.stub(manager, '_readCollectionMetadata');
    readEnabledManifestStub = sinon.stub(manager, '_readEnabledManifest');

    // Configure the metadata for each collection directory found
    readMetaStub.withArgs('collection-a').resolves({
      name: 'collection-a',
      source: 'https://a.com/repo.git',
      added_on: '2025-01-01'
    });
    readMetaStub.withArgs('collection-b').resolves({
      name: 'collection-b',
      source: 'https://b.com/repo.git',
      added_on: '2025-02-02'
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should list all collections found as directories in the collection root', async () => {
    // Act
    const result = await manager.listCollections('downloaded');

    // Assert
    // 1. Check that the result is an array with the correct number of collections
    expect(result).to.be.an('array').with.lengthOf(2);

    // 2. Verify the content of the returned collection info
    expect(result[0].name).to.equal('collection-a');
    expect(result[0].source).to.equal('https://a.com/repo.git');
    expect(result[1].name).to.equal('collection-b');
    expect(result[1].source).to.equal('https://b.com/repo.git');

    // 3. Verify that the correct underlying functions were called
    expect(mockDependencies.fs.readdir.calledWith(FAKE_COLL_ROOT)).to.be.true;
    expect(readMetaStub.calledTwice).to.be.true;

    // 4. Verify it did NOT check the enabled manifest, as per the code's implementation
    expect(readEnabledManifestStub.called).to.be.false;
  });
});
