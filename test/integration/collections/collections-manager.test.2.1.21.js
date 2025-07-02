// test/integration/collections/collections-manager.test.2.1.21.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.21
describe('CollectionsManager enablePlugin (2.1.21)', () => {
    it("should throw an error if the plugin's config path does not exist", async () => {
        // Arrange
        const FAKE_CONFIG_PATH = '/path/to/non-existent.config.yaml';
        const mockDependencies = {
            // --- Key for this test: The config path is not found on the filesystem ---
            fss: { existsSync: sinon.stub().returns(false) },
            chalk: { magenta: str => str, blueBright: str => str, }
        };
        const manager = new CollectionsManager({}, mockDependencies);

        sinon.stub(manager, 'listAvailablePlugins').resolves([{
            plugin_id: 'my-plugin',
            collection: 'test-collection',
            config_path: FAKE_CONFIG_PATH
        }]);
        const readManifestStub = sinon.stub(manager, '_readEnabledManifest');

        // Act & Assert
        try {
            await manager.enablePlugin('test-collection/my-plugin');
            expect.fail('Expected enablePlugin to throw for a missing config path.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.contain('is invalid or not found');
            expect(error.message).to.contain(FAKE_CONFIG_PATH);
        }

        expect(readManifestStub.called).to.be.false;
    });
});
