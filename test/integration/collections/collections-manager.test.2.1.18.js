// test/integration/collections/collections-manager.test.2.1.18.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.18
describe('CollectionsManager enablePlugin (2.1.18)', () => {
    let manager;

    beforeEach(() => {
        const mockDependencies = {
            fss: { existsSync: sinon.stub().returns(true) },
            // Removed: Custom chalk mock. Now relies on the global chalk mock from test/setup.js
            // chalk: { magenta: str => str, green: str => str, blueBright: str => str, }
        };
        manager = new CollectionsManager({}, mockDependencies);

        sinon.stub(manager, 'listAvailablePlugins').resolves([{
            plugin_id: 'my-plugin',
            collection: 'test-collection',
            config_path: '/fake/config.yaml'
        }]);
        // --- Key for this test: Manifest already has the invoke name ---
        sinon.stub(manager, '_readEnabledManifest').resolves({
            enabled_plugins: [{ invoke_name: 'my-plugin' }]
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should prevent enabling a plugin if the invoke_name already exists', async () => {
        const writeManifestStub = sinon.stub(manager, '_writeEnabledManifest');

        // Act & Assert
        try {
            // Added: bypassValidation: true to ensure this test passes by skipping the new validator.
            await manager.enablePlugin('test-collection/my-plugin', { bypassValidation: true });
            expect.fail('Expected enablePlugin to throw an error for duplicate invoke_name.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(new RegExp(`is already in use`));
        }

        // Verify we did not attempt to write a new manifest
        expect(writeManifestStub.called).to.be.false;
    });
});
