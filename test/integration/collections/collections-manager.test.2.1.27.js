// test/integration/collections/collections-manager.test.2.1.27.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.27
describe('CollectionsManager listAvailablePlugins (2.1.27)', () => {
  it('should throw an error if a collection directory is unreadable', async () => {
    // Arrange
    const readError = new Error('EACCES: permission denied');
    const mockDependencies = {
      fss: { existsSync: sinon.stub().returns(true) },
      fs: { readdir: sinon.stub().rejects(readError) }, // Simulate readdir failing
      path: { join: (a, b) => `${a}/${b}` },
      constants: { METADATA_FILENAME: '.collection-metadata.yaml' },
    };
    const manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);

    // Act & Assert
    try {
      await manager.listAvailablePlugins();
      expect.fail('Expected listAvailablePlugins to throw an error.');
    } catch (error) {
      expect(error).to.equal(readError);
    }
  });
});
