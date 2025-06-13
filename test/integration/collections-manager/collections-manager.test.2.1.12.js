// test/integration/collections-manager/collections-manager.test.2.1.12.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.12
describe('CollectionsManager updateCollection (2.1.12)', () => {

    let mockDependencies;
    let manager;
    let spawnGitStub;

    beforeEach(() => {
        mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) },
            path: { join: (a, b) => `${a}/${b}` },
            chalk: {
                blue: str => str, yellow: str => str, red: str => str,
                magenta: str => str, green: str => str, underline: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);

        sinon.stub(manager, '_readCollectionMetadata').resolves({
            source: 'https://github.com/fake/repo.git'
        });
        spawnGitStub = sinon.stub(manager, '_spawnGitProcess');

        // Mock git commands up to the point of failure
        spawnGitStub.withArgs(['remote', 'show', 'origin']).resolves({ success: true, stdout: 'HEAD branch: main' });
        spawnGitStub.withArgs(['fetch', 'origin']).resolves({ success: true });
        // --- Key for this test: Simulate a dirty working directory ---
        spawnGitStub.withArgs(['status', '--porcelain']).resolves({ success: true, stdout: ' M some-file.js' });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should abort the update if the collection has local changes', async () => {
        // Act
        const result = await manager.updateCollection('dirty-collection');

        // Assert
        expect(result.success).to.be.false;
        expect(result.message).to.contain('has local changes. Aborting update.');

        // Verify that the 'git reset' command was NEVER called
        expect(spawnGitStub.calledWith(sinon.match.array.startsWith(['reset']))).to.be.false;
    });
});
