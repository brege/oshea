// test/integration/collections-manager/collections-manager.test.2.1.3.js
const { expect } = require('chai');
const sinon = require('sinon');
// We still need the real modules to configure the stubs that setup.js creates on them.
const fs = require('fs'); 
const fsPromises = require('fs').promises;
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.3
describe('CollectionsManager addCollection (2.1.3)', () => {

    const FAKE_COLL_ROOT = '/fake/collRoot';
    const FAKE_REPO_URL = 'https://github.com/fake/repo.git';
    const DERIVED_COLLECTION_NAME = 'repo';
    const FAKE_COLLECTION_PATH = `${FAKE_COLL_ROOT}/${DERIVED_COLLECTION_NAME}`;

    let manager;
    let spawnGitStub;
    let writeMetaStub;

    beforeEach(() => {
        // --- FIX ---
        // The stubs are created globally in test/setup.js.
        // We do NOT create them here. We just control their behavior for this test suite.
        fs.existsSync.returns(false); // For this test, we need to simulate the dir NOT existing.
        fsPromises.mkdir.resolves(); // Simulate mkdir success.

        const mockDependencies = {
            path: { join: (a, b) => `${a}/${b}` },
            cmUtils: {
                deriveCollectionName: sinon.stub().returns(DERIVED_COLLECTION_NAME)
            },
            // We can now use the globally stubbed fs/fss objects in our mock dependencies
            fs: fsPromises,
            fss: fs,
            chalk: {
                blue: str => str, green: str => str, yellow: str => str,
                red: str => str, magenta: str => str, underline: str => str,
            }
        };

        manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT }, mockDependencies);
        
        spawnGitStub = sinon.stub(manager, '_spawnGitProcess').resolves({ success: true });
        writeMetaStub = sinon.stub(manager, '_writeCollectionMetadata').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should successfully clone a git repository and write a local metadata file', async () => {
        // Act
        const result = await manager.addCollection(FAKE_REPO_URL);

        // Assert
        expect(result).to.equal(FAKE_COLLECTION_PATH);
        
        // Assert against the stubs, which are now the globally managed ones
        expect(fsPromises.mkdir.calledWith(FAKE_COLL_ROOT, { recursive: true })).to.be.true;
        expect(fs.existsSync.calledWith(FAKE_COLLECTION_PATH)).to.be.true;

        const expectedGitArgs = ['clone', FAKE_REPO_URL, FAKE_COLLECTION_PATH];
        expect(spawnGitStub.calledWith(expectedGitArgs)).to.be.true;
        
        const expectedMetadataMatch = { 
            source: FAKE_REPO_URL,
            name: DERIVED_COLLECTION_NAME,
        };
        expect(writeMetaStub.calledWith(DERIVED_COLLECTION_NAME, sinon.match(expectedMetadataMatch))).to.be.true;
    });
});
