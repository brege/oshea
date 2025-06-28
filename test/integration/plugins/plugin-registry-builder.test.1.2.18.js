// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.18.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.18
describe('PluginRegistryBuilder _getPluginRegistrationsFromCmManifest (1.2.18)', () => {

    it('should correctly load enabled plugins from a valid enabled.yaml manifest', async () => {
        // Arrange
        const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
        const fakeYamlContent = `
enabled_plugins:
  - invoke_name: my-cm-plugin
    config_path: /fake/cm/plugins/my-cm-plugin/config.yaml
    collection_name: 'test-collection'
    plugin_id: 'my-cm-plugin'
    added_on: '2025-06-06T00:00:00.000Z'
`;
        const fakeParsedData = {
            enabled_plugins: [{
                invoke_name: 'my-cm-plugin',
                config_path: '/fake/cm/plugins/my-cm-plugin/config.yaml',
                collection_name: 'test-collection',
                plugin_id: 'my-cm-plugin',
                added_on: '2025-06-06T00:00:00.000Z'
            }]
        };

        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '' },
            fs: { existsSync: sinon.stub().returns(true) }, // The manifest and plugin config both exist
            fsPromises: { readFile: sinon.stub().withArgs(FAKE_MANIFEST_PATH, 'utf8').resolves(fakeYamlContent) },
            yaml: { load: sinon.stub().withArgs(fakeYamlContent).returns(fakeParsedData) },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/cm'
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = await builder._getPluginRegistrationsFromCmManifest(FAKE_MANIFEST_PATH, 'CollectionsManager');

        // Assert
        // 1. Verify the file was read and parsed
        expect(mockDependencies.fsPromises.readFile.calledOnce).to.be.true;
        expect(mockDependencies.yaml.load.calledOnce).to.be.true;

        // 2. Verify the structure of the returned registration object
        expect(result).to.have.property('my-cm-plugin');
        const registration = result['my-cm-plugin'];
        expect(registration.configPath).to.equal('/fake/cm/plugins/my-cm-plugin/config.yaml');
        expect(registration.cmStatus).to.equal('Enabled (CM)');
        expect(registration.cmOriginalCollection).to.equal('test-collection');
        expect(registration.cmOriginalPluginId).to.equal('my-cm-plugin');
        expect(registration.sourceType).to.contain('CM: test-collection/my-cm-plugin');
    });
    
    afterEach(() => {
        sinon.restore();
    });
});
