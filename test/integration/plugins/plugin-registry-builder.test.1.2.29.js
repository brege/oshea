// test/integration/plugins/plugin-registry-builder.test.1.2.29.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.29
describe('PluginRegistryBuilder getAllPluginDetails (1.2.29)', () => {

    it('should correctly set status and source display for traditional plugins', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: {
                join: (a, b) => `${a}/${b}`,
                dirname: () => '',
                basename: (p) => p.split('/').pop() // Simple basename mock
            },
            fs: { 
                existsSync: () => true,
                statSync: () => ({ isFile: () => true })
            },
            process: { env: {} },
            loadYamlConfig: sinon.stub().resolves({}),
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

        // For this test, CM returns no plugins
        const mockCollectionsManager = {
            listAvailablePlugins: sinon.stub().resolves([]),
            listCollections: sinon.stub().resolves([])
        };

        const builder = new PluginRegistryBuilder(
            '/fake/project', null, null, false, false, null, 
            mockCollectionsManager,
            mockDependencies
        );

        // --- Key for this test: The data returned by the internal buildRegistry ---
        const traditionalRegistry = {
            'project-plugin': { sourceType: 'Project Manifest (--config)', definedIn: '/path/to/project.yaml', configPath: '...' },
            'xdg-plugin': { sourceType: 'XDG Global', definedIn: '/path/to/xdg.yaml', configPath: '...' },
            'bundled-plugin': { sourceType: 'Bundled Definitions', definedIn: '/path/to/bundled.yaml', configPath: '...' }
        };
        sinon.stub(builder, 'buildRegistry').resolves(traditionalRegistry);

        // Act
        const result = await builder.getAllPluginDetails();

        // Assert
        expect(result).to.be.an('array').with.lengthOf(3);

        const projectPlugin = result.find(p => p.name === 'project-plugin');
        const xdgPlugin = result.find(p => p.name === 'xdg-plugin');
        const bundledPlugin = result.find(p => p.name === 'bundled-plugin');

        // Check the formatted display strings
        expect(projectPlugin.registrationSourceDisplay).to.equal('Project (--config: project.yaml)');
        expect(xdgPlugin.registrationSourceDisplay).to.equal('XDG (xdg.yaml)');
        expect(bundledPlugin.registrationSourceDisplay).to.equal('Bundled (bundled.yaml)');

        // Check the status strings
        expect(projectPlugin.status).to.equal('Registered (Project Manifest)');
        expect(xdgPlugin.status).to.equal('Registered (XDG Global)');
        expect(bundledPlugin.status).to.equal('Registered (Bundled Definitions)');
    });

    afterEach(() => {
        sinon.restore();
    });
});
