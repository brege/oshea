// test/integration/collections-manager/collections-manager.test.2.1.26.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.26
describe('CollectionsManager listAvailablePlugins (2.1.26)', () => {
    let manager, mockDependencies;

    beforeEach(() => {
        mockDependencies = {
            fss: { existsSync: sinon.stub(), lstatSync: sinon.stub().returns({ isDirectory: () => true }) },
            fs: { readdir: sinon.stub() },
            path: { join: (a, b) => `${a}/${b}` },
            constants: { METADATA_FILENAME: '.collection-metadata.yaml' },
            chalk: {}
        };
        mockDependencies.fss.existsSync.withArgs('/fake/collRoot/empty-collection').returns(true);
        mockDependencies.fss.existsSync.withArgs('/fake/collRoot/no-plugins-collection').returns(true);
        manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);
    });

    afterEach(() => { sinon.restore(); });

    it('should return an empty array for a collection with no directories', async () => {
        // Arrange
        mockDependencies.fs.readdir.withArgs('/fake/collRoot/empty-collection', { withFileTypes: true }).resolves([]);
        
        // Act
        const result = await manager.listAvailablePlugins('empty-collection');

        // Assert
        expect(result).to.be.an('array').that.is.empty;
    });

    it('should return an empty array for a collection with no valid plugin config files', async () => {
        // Arrange
        mockDependencies.fs.readdir.withArgs('/fake/collRoot/no-plugins-collection', { withFileTypes: true }).resolves([
            { name: 'not-a-plugin', isDirectory: () => true }
        ]);
        // Make sure no config files are ever "found"
        mockDependencies.fss.existsSync.returns(false);

        // Act
        const result = await manager.listAvailablePlugins('no-plugins-collection');

        // Assert
        expect(result).to.be.an('array').that.is.empty;
    });
});
