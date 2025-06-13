// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.15.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.15
describe('PluginRegistryBuilder _getPluginRegistrationsFromFile (1.2.15)', () => {

    let builder, mockDependencies;

    beforeEach(() => {
        mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', resolve: () => '' },
            fs: { existsSync: sinon.stub() },
            process: { env: {} },
            loadYamlConfig: sinon.stub()
        };
        builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return an empty object if the config file does not exist', async () => {
        // Arrange
        mockDependencies.fs.existsSync.returns(false);

        // Act
        const result = await builder._getPluginRegistrationsFromFile('/path/to/non-existent.yaml', '/path/to', 'Test');

        // Assert
        expect(result).to.be.an('object').that.is.empty;
        // Verify it didn't try to load the file
        expect(mockDependencies.loadYamlConfig.called).to.be.false;
    });

    it('should return an empty object if the config file is empty or contains no plugins/aliases', async () => {
        // Arrange
        mockDependencies.fs.existsSync.returns(true);
        mockDependencies.loadYamlConfig.resolves({}); // Simulate an empty file

        // Act
        const result = await builder._getPluginRegistrationsFromFile('/path/to/empty.yaml', '/path/to', 'Test');

        // Assert
        expect(result).to.be.an('object').that.is.empty;
        expect(mockDependencies.loadYamlConfig.called).to.be.true;
    });
});
