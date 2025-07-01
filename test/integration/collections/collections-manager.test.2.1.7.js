// test/integration/collections/collections-manager.test.2.1.7.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.7
describe('CollectionsManager removeCollection (2.1.7)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const COLLECTION_TO_REMOVE = 'my-collection';
    const FAKE_COLLECTION_PATH = `${FAKE_COLL_ROOT}/${COLLECTION_TO_REMOVE}`;

    let mockDependencies;
    let manager;
    let disableAllStub;

    beforeEach(() => {
        mockDependencies = {
            fss: {
                existsSync: sinon.stub().returns(true),
                lstatSync: sinon.stub().returns({ isDirectory: () => true })
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
                blue: str => str, yellow: str => str, red: str => str,
                magenta: str => str, green: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

        // Stub methods on the manager instance itself
        // Simulate a manifest that has enabled plugins from the collection
        sinon.stub(manager, '_readEnabledManifest').resolves({
            enabled_plugins: [{ collection_name: COLLECTION_TO_REMOVE, invoke_name: 'test' }]
        });
        disableAllStub = sinon.stub(manager, 'disableAllPluginsFromCollection').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should remove a collection directory and disable its plugins when --force is used', async () => {
        // Act
        // We use { force: true } because our mocked manifest has an enabled plugin.
        const result = await manager.removeCollection(COLLECTION_TO_REMOVE, { force: true });

        // Assert
        // 1. Verify it returns a success status
        expect(result.success).to.be.true;

        // 2. Verify it attempted to disable the plugins from that collection
        expect(disableAllStub.calledWith(COLLECTION_TO_REMOVE)).to.be.true;

        // 3. Verify it attempted to remove the directory
        expect(mockDependencies.fsExtra.rm.calledWith(FAKE_COLLECTION_PATH, { recursive: true, force: true })).to.be.true;
    });

    it('should throw an error if the collection has enabled plugins and --force is not used', async () => {
        // Act & Assert
        try {
            // Call without { force: true }
            await manager.removeCollection(COLLECTION_TO_REMOVE);
            expect.fail('Expected removeCollection to throw, but it did not.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.contain('has enabled plugins');
        }

        // Verify that neither disable nor remove were called
        expect(disableAllStub.called).to.be.false;
        expect(mockDependencies.fsExtra.rm.called).to.be.false;
    });
});
