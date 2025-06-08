// test/collections-manager/collections-manager.test.2.1.8.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../src/collections-manager');

// Test suite for Scenario 2.1.8
describe('CollectionsManager removeCollection (2.1.8)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const NON_EXISTENT_COLLECTION = 'non-existent-collection';

    let mockDependencies;
    let manager;
    let rmStub;

    beforeEach(() => {
        mockDependencies = {
            // --- Key for this test: Simulate that the directory does NOT exist ---
            fss: {
                existsSync: sinon.stub().returns(false),
                // lstatSync should not be called if existsSync is false, but we stub it just in case
                lstatSync: sinon.stub() 
            },
            fsExtra: {
                rm: sinon.stub().resolves()
            },
            path: { 
                join: (a, b) => `${a}/${b}`,
                sep: '/'
            },
            constants: {
                USER_ADDED_PLUGINS_DIR_NAME: '_user_added_plugins'
            },
            chalk: {
                yellow: str => str,
                magenta: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);
        
        // The command will still check the manifest for cleanup
        sinon.stub(manager, '_readEnabledManifest').resolves({ enabled_plugins: [] });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should handle attempts to remove a non-existent collection gracefully', async () => {
        let error = null;
        let result;

        // Act
        try {
            result = await manager.removeCollection(NON_EXISTENT_COLLECTION);
        } catch (e) {
            error = e;
        }

        // Assert
        // 1. Verify that no error was thrown
        expect(error).to.be.null;

        // 2. Verify it returns a success status
        expect(result.success).to.be.true;

        // 3. Verify it did NOT attempt to remove a directory from the filesystem
        expect(mockDependencies.fsExtra.rm.called).to.be.false;
    });
});
