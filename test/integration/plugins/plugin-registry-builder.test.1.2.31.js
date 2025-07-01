// test/integration/plugins/plugin-registry-builder.test.1.2.31.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.31
describe('PluginRegistryBuilder getAllPluginDetails (1.2.31)', () => {

    it('should handle multiple enabled instances of the same CM plugin', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            fs: { existsSync: () => true },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

        // --- Key for this test: The same plugin is enabled twice with different invoke_names ---
        const mockCollectionsManager = {
            listAvailablePlugins: sinon.stub().resolves([
                { collection: 'cm-coll', plugin_id: 'multi-plugin', description: 'Multi-enabled plugin' }
            ]),
            listCollections: sinon.stub().withArgs('enabled').resolves([
                { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-one' },
                { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-two' }
            ])
        };

        const builder = new PluginRegistryBuilder(
            '/fake/project', null, null, false, false, null,
            mockCollectionsManager,
            mockDependencies
        );

        sinon.stub(builder, 'buildRegistry').resolves({});

        // Act
        const result = await builder.getAllPluginDetails();

        // Assert
        expect(result).to.be.an('array').with.lengthOf(2);

        const instanceOne = result.find(p => p.name === 'instance-one');
        const instanceTwo = result.find(p => p.name === 'instance-two');

        // Verify both instances are present in the list
        expect(instanceOne).to.not.be.undefined;
        expect(instanceTwo).to.not.be.undefined;

        // Verify they are correctly identified
        expect(instanceOne.status).to.equal('Enabled (CM)');
        expect(instanceTwo.status).to.equal('Enabled (CM)');
        expect(instanceOne.cmPluginId).to.equal('multi-plugin');
        expect(instanceTwo.cmPluginId).to.equal('multi-plugin');
    });

    afterEach(() => {
        sinon.restore();
    });
});
