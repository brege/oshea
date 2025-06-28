// test/integration/collections/collections-manager.test.2.1.23.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.23
describe('CollectionsManager disablePlugin (2.1.23)', () => {
    let manager;
    let writeManifestStub;

    beforeEach(() => {
        const mockDependencies = {
            chalk: { magenta: str => str, yellow: str => str, }
        };
        manager = new CollectionsManager({}, mockDependencies);

        // Stub manifest to NOT contain the plugin we want to disable
        sinon.stub(manager, '_readEnabledManifest').resolves({
            enabled_plugins: [{ invoke_name: 'some-other-plugin' }]
        });
        writeManifestStub = sinon.stub(manager, '_writeEnabledManifest').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should gracefully handle attempts to disable a non-existent invokeName', async () => {
        // Act
        const result = await manager.disablePlugin('plugin-that-is-not-enabled');

        // Assert
        expect(result.success).to.be.false;
        expect(result.message).to.contain('not found');

        // Verify that since nothing changed, no attempt was made to write a new manifest
        expect(writeManifestStub.called).to.be.false;
    });
});
