// test/integration/collections/collections-manager.test.2.1.6.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.6
describe('CollectionsManager addCollection Name Derivation (2.1.6)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const FAKE_SOURCE_URL = 'https://github.com/fake/repo.git';

    let mockDependencies;
    let manager;
    let spawnGitStub;

    beforeEach(() => {
        mockDependencies = {
            fss: { existsSync: sinon.stub().returns(false) },
            fs: { mkdir: sinon.stub().resolves() },
            path: { join: (a, b) => `${a}/${b}` },
            cmUtils: {
                deriveCollectionName: sinon.stub().returns('derived-name')
            },
            chalk: {
                blue: str => str, yellow: str => str, red: str => str,
                magenta: str => str, underline: str => str, green: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);

        // Stub internal methods that are called after the name is determined
        spawnGitStub = sinon.stub(manager, '_spawnGitProcess').resolves({ success: true });
        sinon.stub(manager, '_writeCollectionMetadata').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should call deriveCollectionName when no name override is provided', async () => {
        // Act
        await manager.addCollection(FAKE_SOURCE_URL);

        // Assert
        // Verify that the utility was called as expected
        expect(mockDependencies.cmUtils.deriveCollectionName.calledWith(FAKE_SOURCE_URL)).to.be.true;

        // Verify that the derived name was used in the subsequent git clone call
        const cloneArgs = spawnGitStub.firstCall.args[0];
        const targetPath = cloneArgs[2];
        expect(targetPath).to.equal(`${FAKE_COLL_ROOT}/derived-name`);
    });

    it('should use the provided name override instead of deriving one', async () => {
        // Arrange
        const nameOverride = 'my-override-name';

        // Act
        await manager.addCollection(FAKE_SOURCE_URL, { name: nameOverride });

        // Assert
        // Verify that the utility was NOT called
        expect(mockDependencies.cmUtils.deriveCollectionName.called).to.be.false;

        // Verify that the overridden name was used in the subsequent git clone call
        const cloneArgs = spawnGitStub.firstCall.args[0];
        const targetPath = cloneArgs[2];
        expect(targetPath).to.equal(`${FAKE_COLL_ROOT}/${nameOverride}`);
    });
});
