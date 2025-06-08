// test/collections-manager/collections-manager.test.2.1.10.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../src/collections-manager');

// Test suite for Scenario 2.1.10
describe('CollectionsManager updateCollection (2.1.10)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const COLLECTION_TO_UPDATE = 'my-git-collection';
    const FAKE_COLLECTION_PATH = `${FAKE_COLL_ROOT}/${COLLECTION_TO_UPDATE}`;

    let mockDependencies;
    let manager;
    let spawnGitStub;
    let writeMetaStub;

    beforeEach(() => {
        mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) },
            path: { join: (a, b) => `${a}/${b}` },
            chalk: {
                blue: str => str, yellow: str => str, red: str => str,
                magenta: str => str, green: str => str, underline: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

        // Stub internal manager methods
        sinon.stub(manager, '_readCollectionMetadata').resolves({
            source: 'https://github.com/fake/repo.git'
        });
        writeMetaStub = sinon.stub(manager, '_writeCollectionMetadata').resolves();
        spawnGitStub = sinon.stub(manager, '_spawnGitProcess');

        // Mock the sequence of git commands for a successful update
        spawnGitStub.withArgs(['remote', 'show', 'origin']).resolves({ success: true, stdout: 'HEAD branch: main' });
        spawnGitStub.withArgs(['fetch', 'origin']).resolves({ success: true });
        spawnGitStub.withArgs(['status', '--porcelain']).resolves({ success: true, stdout: '' }); // No local changes
        spawnGitStub.withArgs(['rev-list', '--count', 'origin/main..HEAD']).resolves({ success: true, stdout: '0' }); // No local commits
        spawnGitStub.withArgs(['reset', '--hard', 'origin/main']).resolves({ success: true });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should successfully pull updates for a clean Git-sourced collection', async () => {
        // Act
        const result = await manager.updateCollection(COLLECTION_TO_UPDATE);

        // Assert
        expect(result.success).to.be.true;
        expect(result.message).to.equal(`Collection "${COLLECTION_TO_UPDATE}" updated.`);

        // Verify the final 'git reset' command was called
        expect(spawnGitStub.calledWith(['reset', '--hard', 'origin/main'])).to.be.true;

        // Verify metadata was updated with a new timestamp
        expect(writeMetaStub.calledOnce).to.be.true;
        expect(writeMetaStub.firstCall.args[1]).to.have.property('updated_on');
    });
});
