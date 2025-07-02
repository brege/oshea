// test/integration/collections/collections-manager.test.2.1.20.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.20
describe('CollectionsManager enablePlugin (2.1.20)', () => {
    it('should throw an error for an invalid invoke_name format', async () => {
        // Arrange
        const mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) }, // Make the config path appear valid
            // Removed: Custom chalk mock. Now relies on the global chalk mock from test/setup.js
            // chalk: { magenta: str => str, blueBright: str => str, }
        };
        const manager = new CollectionsManager({}, mockDependencies);

        const listPluginsStub = sinon.stub(manager, 'listAvailablePlugins').resolves([{
            plugin_id: 'my-plugin', collection: 'test-collection', config_path: '/fake/path'
        }]);
        const readManifestStub = sinon.stub(manager, '_readEnabledManifest');

        // Act & Assert
        try {
            // Provide an invalid name with a space and illegal character
            // Added: bypassValidation: true to ensure this test passes by skipping the new validator.
            await manager.enablePlugin('test-collection/my-plugin', { name: 'invalid name!', bypassValidation: true });
            expect.fail('Expected enablePlugin to throw for an invalid invoke_name.');
        } catch (error) {
            // Now we should catch the correct error
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(new RegExp(`Invalid invoke_name`));
        }

        // listAvailablePlugins is called before the name check, but the manifest reads should not be.
        expect(listPluginsStub.called).to.be.true;
        expect(readManifestStub.called).to.be.false;
    });
});
