// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.30.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.30
describe('PluginRegistryBuilder getAllPluginDetails (1.2.30)', () => {

    it("should correctly distinguish between 'Enabled (CM)' and 'Available (CM)' plugins", async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            fs: { existsSync: () => true },
            process: { env: {} }
        };

        // --- Key for this test: The mock CM returns both available and enabled plugins ---
        const mockCollectionsManager = {
            listAvailablePlugins: sinon.stub().resolves([
                { collection: 'coll-1', plugin_id: 'plugin-a', description: 'Available only' },
                { collection: 'coll-1', plugin_id: 'plugin-b', description: 'Available and Enabled' }
            ]),
            listCollections: sinon.stub().withArgs('enabled').resolves([
                { collection_name: 'coll-1', plugin_id: 'plugin-b', invoke_name: 'enabled-plugin-b' }
            ])
        };

        const builder = new PluginRegistryBuilder(
            '/fake/project', null, null, false, false, null, 
            mockCollectionsManager,
            mockDependencies
        );

        // For this test, assume no traditionally registered plugins
        sinon.stub(builder, 'buildRegistry').resolves({});

        // Act
        const result = await builder.getAllPluginDetails();

        // Assert
        expect(result).to.be.an('array').with.lengthOf(2);

        // Find each specific plugin in the final list
        const availablePlugin = result.find(p => p.name === 'coll-1/plugin-a');
        const enabledPlugin = result.find(p => p.name === 'enabled-plugin-b');

        // Verify their statuses are set correctly
        expect(availablePlugin.status).to.equal('Available (CM)');
        expect(enabledPlugin.status).to.equal('Enabled (CM)');
    });

    afterEach(() => {
        sinon.restore();
    });
});
