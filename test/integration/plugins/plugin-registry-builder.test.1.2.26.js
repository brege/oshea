// test/integration/plugins/plugin-registry-builder.test.1.2.26.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.26
describe('PluginRegistryBuilder buildRegistry (1.2.26)', () => {
    it('should handle a missing factoryDefaultMainConfigPath gracefully', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
            // --- Key for this test: The factory default config does NOT exist ---
            fs: { existsSync: sinon.stub().returns(false) },
            process: { env: {} },
            loadYamlConfig: sinon.stub().resolves({}),
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);
        
        // Spy on the method that should NOT be called
        const getFromFileSpy = sinon.spy(builder, '_getPluginRegistrationsFromFile');
        let error = null;
        let result;

        // Act
        try {
            result = await builder.buildRegistry();
        } catch (e) {
            error = e;
        }

        // Assert
        // Verify it did not throw an error
        expect(error).to.be.null;
        // Verify it did not attempt to load from a non-existent file
        expect(getFromFileSpy.called).to.be.false;
        // Verify it returned an empty registry
        expect(result).to.deep.equal({});
    });

    afterEach(() => {
        sinon.restore();
    });
});
