// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.28.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.28
describe('PluginRegistryBuilder getAllPluginDetails (1.2.28)', () => {

    it("should correctly retrieve and include each plugin's description", async () => {
        // Arrange
        const TRADITIONAL_CONFIG_PATH = '/path/to/traditional.config.yaml';
        const CM_CONFIG_PATH = '/path/to/cm.config.yaml';
        const CM_DESCRIPTION = 'A Collections Manager plugin.';

        // The YAML loader is only needed for the traditional plugin in this flow
        const loadYamlConfigStub = sinon.stub();
        loadYamlConfigStub.withArgs(TRADITIONAL_CONFIG_PATH).resolves({ description: 'A traditional plugin.' });
        
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            fs: { 
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ isFile: () => true })
            },
            process: { env: {} },
            loadYamlConfig: loadYamlConfigStub
        };
        
        // --- FIX: Ensure the 'available' list contains the 'enabled' plugin ---
        const mockCollectionsManager = {
            listAvailablePlugins: sinon.stub().resolves([
                { collection: 'cm-coll', plugin_id: 'cm-plugin', description: CM_DESCRIPTION, config_path: CM_CONFIG_PATH }
            ]),
            listCollections: sinon.stub().withArgs('enabled').resolves([
                 { collection_name: 'cm-coll', plugin_id: 'cm-plugin', invoke_name: 'cm-plugin', config_path: CM_CONFIG_PATH }
            ])
        };

        const builder = new PluginRegistryBuilder(
            '/fake/project', null, null, false, false, null, 
            mockCollectionsManager,
            mockDependencies
        );

        sinon.stub(builder, 'buildRegistry').resolves({
            'traditional-plugin': { sourceType: 'Project', configPath: TRADITIONAL_CONFIG_PATH }
        });

        // Act
        const result = await builder.getAllPluginDetails();

        // Assert
        expect(result).to.be.an('array').with.lengthOf(2);

        const traditionalPlugin = result.find(p => p.name === 'traditional-plugin');
        const cmPlugin = result.find(p => p.name === 'cm-plugin');

        expect(traditionalPlugin.description).to.equal('A traditional plugin.');
        // --- FIX: The description for the CM plugin can now be correctly retrieved ---
        expect(cmPlugin.description).to.equal(CM_DESCRIPTION);
    });
    
    afterEach(() => {
        sinon.restore();
    });
});
