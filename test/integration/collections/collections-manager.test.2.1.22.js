// test/integration/collections-manager/collections-manager.test.2.1.22.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections-manager');

// Test suite for Scenario 2.1.22
describe('CollectionsManager disablePlugin (2.1.22)', () => {
    let manager;
    let writeManifestStub;
    const PLUGIN_TO_DISABLE = 'my-plugin-to-disable';

    beforeEach(() => {
        const mockDependencies = {
            chalk: { magenta: str => str, green: str => str }
        };
        manager = new CollectionsManager({}, mockDependencies);

        // Stub manifest to contain the plugin we want to disable
        sinon.stub(manager, '_readEnabledManifest').resolves({
            enabled_plugins: [
                { invoke_name: 'another-plugin' },
                { invoke_name: PLUGIN_TO_DISABLE }
            ]
        });
        writeManifestStub = sinon.stub(manager, '_writeEnabledManifest').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should successfully remove a plugin from the enabled manifest', async () => {
        // Act
        const result = await manager.disablePlugin(PLUGIN_TO_DISABLE);

        // Assert
        expect(result.success).to.be.true;
        
        // Verify that a new manifest was written
        expect(writeManifestStub.calledOnce).to.be.true;

        // Check that the written manifest no longer contains the disabled plugin
        const manifestWritten = writeManifestStub.firstCall.args[0];
        expect(manifestWritten.enabled_plugins).to.be.an('array').with.lengthOf(1);
        expect(manifestWritten.enabled_plugins[0].invoke_name).to.equal('another-plugin');
    });
});
