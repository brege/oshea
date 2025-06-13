// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.21.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.21
describe('PluginRegistryBuilder _getPluginRegistrationsFromCmManifest (1.2.21)', () => {

    it("should skip plugins whose config_path doesn't exist", async () => {
        // Arrange
        const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
        const MISSING_CONFIG_PATH = '/path/to/missing/config.yaml';
        const fakeParsedData = {
            enabled_plugins: [{
                invoke_name: 'plugin-with-missing-config',
                config_path: MISSING_CONFIG_PATH
            }]
        };
        
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(FAKE_MANIFEST_PATH).returns(true); // The manifest itself exists
        // --- Key for this test: The plugin's config_path does NOT exist ---
        existsSyncStub.withArgs(MISSING_CONFIG_PATH).returns(false); 

        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '' },
            fs: { existsSync: existsSyncStub },
            fsPromises: { readFile: sinon.stub().resolves('') },
            yaml: { load: sinon.stub().returns(fakeParsedData) },
            process: { env: {} }
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = await builder._getPluginRegistrationsFromCmManifest(FAKE_MANIFEST_PATH, 'Test');

        // Assert
        expect(result).to.be.an('object').that.is.empty;
    });

    afterEach(() => {
        sinon.restore();
    });
});
