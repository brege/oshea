// test/integration/collections-manager/collections-manager.test.2.1.28.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.28
describe('CollectionsManager listAvailablePlugins (2.1.28)', () => {
    let manager, mockDependencies;

    beforeEach(() => {
        // --- FIX: lstatSync now returns a complete object with both methods ---
        const lstatSyncStub = sinon.stub();
        lstatSyncStub.returns({ isDirectory: () => true, isFile: () => false }); // Default to directory
        lstatSyncStub.withArgs('/fake/collRoot/my-collection/my-plugin/my-plugin.config.yaml').returns({ isDirectory: () => false, isFile: () => true });

        mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true), lstatSync: lstatSyncStub },
            fs: { readdir: sinon.stub().resolves([{ name: 'my-plugin', isDirectory: () => true }]), readFile: sinon.stub() },
            yaml: { load: sinon.stub() },
            path: { join: (a, b) => `${a}/${b}`, resolve: p => p, basename: p => p.split('/').pop() },
            constants: { METADATA_FILENAME: '.collection-metadata.yaml' },
            chalk: { red: str => str, yellow: str => str, magenta: str => str }
        };
        manager = new CollectionsManager({ collRootFromMainConfig: '/fake/collRoot' }, mockDependencies);
        mockDependencies.fss.existsSync.withArgs('/fake/collRoot/my-collection/my-plugin/my-plugin.config.yaml').returns(true);
    });

    afterEach(() => { sinon.restore(); });

    it('should correctly extract the description from a plugin config file', async () => {
        const descriptionText = 'This is a test plugin.';
        mockDependencies.fs.readFile.resolves(`description: ${descriptionText}`);
        mockDependencies.yaml.load.returns({ description: descriptionText });
        const result = await manager.listAvailablePlugins('my-collection');
        expect(result[0].description).to.equal(descriptionText);
    });

    it('should provide a default description if one is not available in the config', async () => {
        mockDependencies.fs.readFile.resolves('some_other_key: value');
        mockDependencies.yaml.load.returns({ some_other_key: 'value' });
        const result = await manager.listAvailablePlugins('my-collection');
        expect(result[0].description).to.equal('Plugin description not available.');
    });
});
