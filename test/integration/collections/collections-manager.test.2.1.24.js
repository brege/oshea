// test/integration/collections/collections-manager.test.2.1.24.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.24
describe('CollectionsManager listAvailablePlugins (2.1.24)', () => {
    let manager;
    let mockDependencies;

    beforeEach(() => {
        const lstatSyncStub = sinon.stub();
        lstatSyncStub.returns({ isDirectory: () => true, isFile: () => false }); // Default to directory
        lstatSyncStub.withArgs('/fake/collRoot/collection-a/plugin-1/plugin-1.config.yaml').returns({ isDirectory: () => false, isFile: () => true });
        lstatSyncStub.withArgs('/fake/collRoot/collection-b/plugin-2/plugin-2.config.yaml').returns({ isDirectory: () => false, isFile: () => true });

        mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true), lstatSync: lstatSyncStub },
            fs: { readdir: sinon.stub(), readFile: sinon.stub() },
            yaml: { load: sinon.stub() },
            path: { join: (a, b) => `${a}/${b}`, resolve: p => p, basename: p => p.split('/').pop() },
            constants: { METADATA_FILENAME: '.collection-metadata.yaml', USER_ADDED_PLUGINS_DIR_NAME: '_user_added_plugins' },
            chalk: { yellow: str => str, red: str => str, magenta: str => str, bgYellow: { black: str => str } }
        };
        manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);
        sinon.stub(manager, '_readCollectionMetadata').resolves(null);

        mockDependencies.fs.readdir.withArgs('/fake/collRoot', { withFileTypes: true }).resolves([
            { name: 'collection-a', isDirectory: () => true },
            { name: 'collection-b', isDirectory: () => true }
        ]);
        mockDependencies.fs.readdir.withArgs('/fake/collRoot/collection-a', { withFileTypes: true }).resolves([
            { name: 'plugin-1', isDirectory: () => true }
        ]);
        mockDependencies.fs.readdir.withArgs('/fake/collRoot/collection-b', { withFileTypes: true }).resolves([
            { name: 'plugin-2', isDirectory: () => true }
        ]);
        mockDependencies.fs.readFile.withArgs('/fake/collRoot/collection-a/plugin-1/plugin-1.config.yaml', 'utf8').resolves('description: Plugin One');
        mockDependencies.yaml.load.withArgs('description: Plugin One').returns({ description: 'Plugin One' });
        mockDependencies.fs.readFile.withArgs('/fake/collRoot/collection-b/plugin-2/plugin-2.config.yaml', 'utf8').resolves('description: Plugin Two');
        mockDependencies.yaml.load.withArgs('description: Plugin Two').returns({ description: 'Plugin Two' });
        mockDependencies.fss.existsSync.withArgs('/fake/collRoot/collection-a/plugin-1/plugin-1.config.yaml').returns(true);
        mockDependencies.fss.existsSync.withArgs('/fake/collRoot/collection-b/plugin-2/plugin-2.config.yaml').returns(true);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly scan all collections and aggregate available plugins', async () => {
        const result = await manager.listAvailablePlugins();
        expect(result).to.be.an('array').with.lengthOf(2);
        expect(result[0].description).to.equal('Plugin One');
        expect(result[1].description).to.equal('Plugin Two');
    });
});
