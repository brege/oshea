// test/plugin-registry-builder/plugin-registry-builder.test.1.2.25.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.25
describe('PluginRegistryBuilder buildRegistry (1.2.25)', () => {
    it('should include CM plugins when no CM instance is provided', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            fs: { existsSync: sinon.stub().returns(true) },
            process: { env: {} }
        };
        // --- Key for this test: collectionsManagerInstance is null ---
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        const getFromCmStub = sinon.stub(builder, '_getPluginRegistrationsFromCmManifest').resolves({ 'my-cm-plugin': {} });
        sinon.stub(builder, '_getPluginRegistrationsFromFile').resolves({});

        // Act
        const result = await builder.buildRegistry();

        // Assert
        expect(getFromCmStub.calledOnce).to.be.true;
        expect(result).to.have.property('my-cm-plugin');
    });

    afterEach(() => {
        sinon.restore();
    });
});
