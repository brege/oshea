// test/integration/plugins/plugin-registry-builder.test.1.2.5.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.5
describe('PluginRegistryBuilder _resolveAlias (1.2.5)', () => {

    it('should resolve a relative alias value against the provided base path', () => {
        // Arrange
        const FAKE_BASE_PATH = '/path/to/config/dir';
        const FAKE_RESOLVED_PATH = '/path/to/config/dir/relative/path';

        const mockDependencies = {
            path: {
                isAbsolute: sinon.stub().returns(false),
                resolve: sinon.stub().returns(FAKE_RESOLVED_PATH),
                join: (a, b) => `${a}/${b}`, // Needed by constructor
                dirname: () => '' // Needed by constructor
            },
            os: {
                homedir: () => '/fake/home', // Needed by constructor
                platform: () => 'linux' // Needed by constructor
            },
            fs: { existsSync: () => true }, // Needed by constructor
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = builder._resolveAlias('my-alias', './relative/path', FAKE_BASE_PATH);

        // Assert
        expect(result).to.equal(FAKE_RESOLVED_PATH);
        expect(mockDependencies.path.resolve.calledWith(FAKE_BASE_PATH, './relative/path')).to.be.true;
    });
});
