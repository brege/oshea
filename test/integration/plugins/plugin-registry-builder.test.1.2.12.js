// test/integration/plugins/plugin-registry-builder.test.1.2.12.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.12
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.12)', () => {

    it('should return null if the resolved path does not exist', () => {
        // Arrange
        const NON_EXISTENT_PATH = '/path/to/nothing';
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, isAbsolute: () => true, dirname: () => '', resolve: () => '' },
            // --- Key for this test: The path does NOT exist ---
            fs: { existsSync: sinon.stub().returns(false) },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = builder._resolvePluginConfigPath(NON_EXISTENT_PATH, null, null);

        // Assert
        expect(result).to.be.null;
    });

    afterEach(() => {
        sinon.restore();
    });
});
