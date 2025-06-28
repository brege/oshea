// test/integration/collections-manager/collections-manager.test.2.1.16.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.16
describe('CollectionsManager listCollections (2.1.16)', () => {

    let manager;
    let mockDependencies;

    beforeEach(() => {
        mockDependencies = {
            fss: { existsSync: sinon.stub() },
            fs: { readdir: sinon.stub() },
            path: { join: (a, b) => `${a}/${b}` },
            chalk: { red: str => str }
        };
        manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);
    });

    afterEach(() => {
        sinon.restore();
    });

    it("should return an empty array for 'downloaded' type if the collection root does not exist", async () => {
        // Arrange
        mockDependencies.fss.existsSync.returns(false);

        // Act
        const result = await manager.listCollections('downloaded');

        // Assert
        expect(result).to.be.an('array').that.is.empty;
        // Verify it did not try to read a directory that doesn't exist
        expect(mockDependencies.fs.readdir.called).to.be.false;
    });

    it("should return an empty array for 'enabled' type if the enabled manifest is missing or empty", async () => {
        // Arrange
        // Simulate an empty manifest being returned
        const readManifestStub = sinon.stub(manager, '_readEnabledManifest').resolves({ enabled_plugins: [] });

        // Act
        const result = await manager.listCollections('enabled');

        // Assert
        expect(result).to.be.an('array').that.is.empty;
        expect(readManifestStub.called).to.be.true;
    });
});
