// test/integration/collections-manager/collections-manager.test.2.1.9.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.9
describe('CollectionsManager removeCollection (2.1.9)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const COLLECTION_TO_REMOVE = 'my-collection';

    let mockDependencies;
    let manager;

    beforeEach(() => {
        mockDependencies = {
            fss: {
                existsSync: sinon.stub().returns(true),
                lstatSync: sinon.stub().returns({ isDirectory: () => true })
            },
            fsExtra: {
                // --- Key for this test: Simulate that fs-extra fails to remove the directory ---
                rm: sinon.stub().rejects(new Error('EPERM: permission denied'))
            },
            path: { 
                join: (a, b) => `${a}/${b}`,
                sep: '/'
            },
            constants: {
                USER_ADDED_PLUGINS_DIR_NAME: '_user_added_plugins'
            },
            chalk: {
                red: str => str,
                magenta: str => str,
                green: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

        // For this test, assume no plugins were enabled to simplify the path
        sinon.stub(manager, '_readEnabledManifest').resolves({ enabled_plugins: [] });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should throw an error if the directory deletion fails', async () => {
        // Act & Assert
        try {
            await manager.removeCollection(COLLECTION_TO_REMOVE);
            expect.fail('Expected removeCollection to throw an error, but it did not.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('EPERM: permission denied');
        }

        // Verify that it did attempt to remove the directory
        expect(mockDependencies.fsExtra.rm.called).to.be.true;
    });
});
