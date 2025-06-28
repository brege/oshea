// test/integration/collections/collections-manager.test.2.1.19.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.19
describe('CollectionsManager enablePlugin (2.1.19)', () => {
    it('should throw an error when trying to enable a non-existent plugin', async () => {
        // Arrange
        const manager = new CollectionsManager({}, { chalk: { magenta: str => str, blueBright: str => str }});
        
        // --- Key for this test: The plugin is not in the list of available plugins ---
        sinon.stub(manager, 'listAvailablePlugins').resolves([
            { plugin_id: 'some-other-plugin', collection: 'test-collection' }
        ]);
        const readManifestStub = sinon.stub(manager, '_readEnabledManifest');

        // Act & Assert
        try {
            await manager.enablePlugin('test-collection/non-existent-plugin');
            expect.fail('Expected enablePlugin to throw an error for a non-existent plugin.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.contain('is not available or does not exist');
        }
        
        // Verify it failed early
        expect(readManifestStub.called).to.be.false;
    });
});
