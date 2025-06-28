// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.19.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.19
describe('PluginRegistryBuilder _getPluginRegistrationsFromCmManifest (1.2.19)', () => {

    it('should return an empty object if the CM manifest file does not exist', async () => {
        // Arrange
        const FAKE_MANIFEST_PATH = '/fake/cm/enabled.yaml';
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '' },
            // --- Key for this test: The manifest file does NOT exist ---
            fs: { existsSync: sinon.stub().withArgs(FAKE_MANIFEST_PATH).returns(false) },
            fsPromises: { readFile: sinon.stub() },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/cm'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = await builder._getPluginRegistrationsFromCmManifest(FAKE_MANIFEST_PATH, 'Test');

        // Assert
        expect(result).to.be.an('object').that.is.empty;
        // Verify it did not attempt to read the file
        expect(mockDependencies.fsPromises.readFile.called).to.be.false;
    });

    afterEach(() => {
        sinon.restore();
    });
});
