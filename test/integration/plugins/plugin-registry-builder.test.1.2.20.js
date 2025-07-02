// test/integration/plugins/plugin-registry-builder.test.1.2.20.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.20
describe('PluginRegistryBuilder _getPluginRegistrationsFromCmManifest (1.2.20)', () => {

    it('should skip invalid entries in the manifest', async () => {
        // Arrange
        const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
        // --- Key for this test: The manifest contains invalid entries ---
        const fakeParsedData = {
            enabled_plugins: [
                { invoke_name: 'good-plugin', config_path: '/fake/path' }, // Valid entry
                { invoke_name: 'bad-plugin-no-path' }, // Invalid: missing config_path
                null, // Invalid: null entry
                { config_path: '/another/fake/path' } // Invalid: missing invoke_name
            ]
        };

        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '' },
            fs: { existsSync: sinon.stub().returns(true) },
            fsPromises: { readFile: sinon.stub().resolves('') },
            yaml: { load: sinon.stub().returns(fakeParsedData) },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/cm'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = await builder._getPluginRegistrationsFromCmManifest(FAKE_MANIFEST_PATH, 'Test');

        // Assert
        // Verify only the single valid plugin was registered
        expect(Object.keys(result)).to.have.lengthOf(1);
        expect(result).to.have.property('good-plugin');
    });

    afterEach(() => {
        sinon.restore();
    });
});
