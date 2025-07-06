// test/integration/collections/collections-manager.test.2.1.11.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.11
describe('CollectionsManager updateCollection (2.1.11)', () => {

  let mockDependencies;
  let manager;

  beforeEach(() => {
    mockDependencies = {
      // --- Key for this test: Simulate that the directory does NOT exist ---
      fss: { existsSync: sinon.stub().returns(false) },
      path: { join: (a, b) => `${a}/${b}` },
      chalk: { red: str => str, magenta: str => str, }
    };

    manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should gracefully handle updating a non-existent collection', async () => {
    // Arrange
    const readMetaStub = sinon.stub(manager, '_readCollectionMetadata');

    // Act
    const result = await manager.updateCollection('non-existent-collection');

    // Assert
    expect(result.success).to.be.false;
    expect(result.message).to.equal('Collection "non-existent-collection" not found.');

    // Ensure it exited early and did not attempt to read metadata
    expect(readMetaStub.called).to.be.false;
  });
});
