// test/integration/collections/collections-manager.test.2.1.25.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.25
describe('CollectionsManager listAvailablePlugins (2.1.25)', () => {
  it('should correctly filter results when a collectionName is provided', async () => {
    // Arrange
    const lstatSyncStub = sinon.stub();
    lstatSyncStub.withArgs('/fake/collRoot/collection-a').returns({ isDirectory: () => true, isFile: () => false });
    lstatSyncStub.withArgs('/fake/collRoot/collection-a/plugin-1/plugin-1.config.yaml').returns({ isDirectory: () => false, isFile: () => true });

    const mockDependencies = {
      fss: { existsSync: sinon.stub().returns(true), lstatSync: lstatSyncStub },
      fs: { readdir: sinon.stub().resolves([{ name: 'plugin-1', isDirectory: () => true }]), readFile: sinon.stub().resolves('') },
      yaml: { load: sinon.stub().returns({}) },
      path: { join: (a, b) => `${a}/${b}`, resolve: p => p, basename: p => p.split('/').pop() },
      constants: { METADATA_FILENAME: '.collection-metadata.yaml' },
      chalk: {}
    };
    const manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);

    // Act
    const result = await manager.listAvailablePlugins('collection-a');

    // Assert
    expect(mockDependencies.fs.readdir.calledWith('/fake/collRoot/collection-a')).to.be.true;
    expect(result).to.be.an('array').with.lengthOf(1);
  });
});
