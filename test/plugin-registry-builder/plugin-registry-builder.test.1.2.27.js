// test/plugin-registry-builder/plugin-registry-builder.test.1.2.27.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.27
describe('PluginRegistryBuilder getAllPluginDetails (1.2.27)', () => {
    it('should combine plugins from traditional and CM sources', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            fs: { existsSync: () => true, statSync: () => ({ isFile: () => true }) },
            process: { env: {} },
            loadYamlConfig: sinon.stub().resolves({})
        };

        // --- FIX: Ensure the 'available' list is a superset of the 'enabled' list ---
        const mockCollectionsManager = {
            listAvailablePlugins: sinon.stub().resolves([
                { collection: 'cm-coll', plugin_id: 'cm-plugin-1', description: 'Available CM Plugin' },
                // This entry corresponds to the enabled plugin below
                { collection: 'cm-coll', plugin_id: 'cm-plugin-2', description: 'Plugin that will be enabled' }
            ]),
            listCollections: sinon.stub().withArgs('enabled').resolves([
                { collection_name: 'cm-coll', plugin_id: 'cm-plugin-2', invoke_name: 'enabled-plugin' }
            ])
        };

        const builder = new PluginRegistryBuilder(
            '/fake/project', null, null, false, false, null, 
            mockCollectionsManager,
            mockDependencies
        );

        sinon.stub(builder, 'buildRegistry').resolves({
            'traditional-plugin': { sourceType: 'Bundled' }
        });

        // Act
        const result = await builder.getAllPluginDetails();

        // Assert
        expect(result).to.be.an('array').with.lengthOf(3);

        const names = result.map(p => p.name);
        expect(names).to.include('traditional-plugin');
        expect(names).to.include('enabled-plugin');
        expect(names).to.include('cm-coll/cm-plugin-1');
    });

    afterEach(() => {
        sinon.restore();
    });
});
