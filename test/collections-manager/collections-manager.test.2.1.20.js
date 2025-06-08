// test/collections-manager/collections-manager.test.2.1.20.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../src/collections-manager');

// Test suite for Scenario 2.1.20
describe('CollectionsManager enablePlugin (2.1.20)', () => {
    it('should throw an error for an invalid invoke_name format', async () => {
        // Arrange
        // --- FIX: Mock dependencies to ensure the config_path check passes ---
        const mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) }, // Make the config path appear valid
            chalk: { magenta: str => str, blueBright: str => str, }
        };
        const manager = new CollectionsManager({}, mockDependencies);
        
        const listPluginsStub = sinon.stub(manager, 'listAvailablePlugins').resolves([{
            plugin_id: 'my-plugin', collection: 'test-collection', config_path: '/fake/path'
        }]);
        const readManifestStub = sinon.stub(manager, '_readEnabledManifest');

        // Act & Assert
        try {
            // Provide an invalid name with a space and illegal character
            await manager.enablePlugin('test-collection/my-plugin', { name: 'invalid name!' });
            expect.fail('Expected enablePlugin to throw for an invalid invoke_name.');
        } catch (error) {
            // Now we should catch the correct error
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.contain('Invalid invoke_name');
        }

        // listAvailablePlugins is called before the name check, but the manifest reads should not be.
        expect(listPluginsStub.called).to.be.true;
        expect(readManifestStub.called).to.be.false;
    });
});
