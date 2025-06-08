// test/collections-manager/collections-manager.test.2.1.4.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../src/collections-manager');

// Test suite for Scenario 2.1.4
describe('CollectionsManager addCollection (2.1.4)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const FAKE_REPO_URL = 'https://github.com/fake/repo.git';
    const DERIVED_COLLECTION_NAME = 'repo';
    const FAKE_COLLECTION_PATH = `${FAKE_COLL_ROOT}/${DERIVED_COLLECTION_NAME}`;

    let mockDependencies;
    let manager;
    let spawnGitStub;
    let writeMetaStub;

    beforeEach(() => {
        // Mock all necessary dependencies
        mockDependencies = {
            // --- Key for this test: Simulate that the directory already exists ---
            fss: {
                existsSync: sinon.stub().returns(true) 
            },
            fs: {
                mkdir: sinon.stub().resolves()
            },
            path: { 
                join: (a, b) => `${a}/${b}` 
            },
            cmUtils: {
                deriveCollectionName: sinon.stub().returns(DERIVED_COLLECTION_NAME)
            },
            chalk: { // Mute chalk for cleaner test output
                blue: str => str,
                yellow: str => str,
                red: str => str,
                magenta: str => str,
                underline: str => str,
            }
        };

        // Instantiate the manager with our mocked dependencies
        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);
        
        // Stub the internal methods that should NOT be called if the logic is correct
        spawnGitStub = sinon.stub(manager, '_spawnGitProcess');
        writeMetaStub = sinon.stub(manager, '_writeCollectionMetadata');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should throw an error if the target collection directory already exists', async () => {
        // Act & Assert
        try {
            await manager.addCollection(FAKE_REPO_URL);
            // If the function does not throw, this line will be reached and fail the test
            expect.fail('Expected addCollection to throw an error, but it did not.');
        } catch (error) {
            // Verify the error is of the correct type and has the expected message
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(`Error: Target directory '${FAKE_COLLECTION_PATH}' already exists. Please remove it or choose a different name.`);
        }

        // Verify that no attempt was made to clone or write metadata because the function exited early
        expect(spawnGitStub.called).to.be.false;
        expect(writeMetaStub.called).to.be.false;
    });
});
