// test/integration/collections/collections-manager.test.2.1.15.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.14
describe('CollectionsManager listCollections (2.1.14)', () => {

    let manager;
    const fakeEnabledPlugins = [
        { invoke_name: 'plugin-a', collection_name: 'collection-1' },
        { invoke_name: 'plugin-b', collection_name: 'collection-2' },
        { invoke_name: 'plugin-c', collection_name: 'collection-1' }
    ];

    beforeEach(() => {
        const mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) }, // For is_original_source_missing check
        };
        manager = new CollectionsManager({}, mockDependencies);

        // Stub the manifest read to return a predictable list of enabled plugins
        sinon.stub(manager, '_readEnabledManifest').resolves({
            enabled_plugins: fakeEnabledPlugins
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it("should return a list of all enabled plugins when filter is 'enabled'", async () => {
        // Act
        const result = await manager.listCollections('enabled');

        // Assert
        expect(result).to.be.an('array').with.lengthOf(3);
        // The result should be the sorted list from the manifest
        expect(result[0].invoke_name).to.equal('plugin-a');
    });

    it("should correctly filter the enabled plugins by collection name when provided", async () => {
        // Act
        const result = await manager.listCollections('enabled', 'collection-1');

        // Assert
        expect(result).to.be.an('array').with.lengthOf(2);
        expect(result.every(p => p.collection_name === 'collection-1')).to.be.true;
    });
});
