// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.14.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.14
describe('PluginRegistryBuilder _getPluginRegistrationsFromFile (1.2.14)', () => {

    let builder;
    let mockDependencies;
    let resolveAliasStub, resolvePluginPathStub;

    beforeEach(() => {
        // Mock dependencies needed for the constructor to succeed
        mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', resolve: () => '' },
            fs: { existsSync: sinon.stub().returns(true) },
            process: { env: {} },
            loadYamlConfig: sinon.stub() // This is the main dependency for the method under test
        };
        builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);
        
        // Stub the helper methods that are called by _getPluginRegistrationsFromFile
        resolveAliasStub = sinon.stub(builder, '_resolveAlias');
        resolvePluginPathStub = sinon.stub(builder, '_resolvePluginConfigPath');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should load aliases and plugin registrations from a valid config file', async () => {
        // Arrange
        const FAKE_CONFIG_PATH = '/path/to/main.yaml';
        const fakeYamlData = {
            plugin_directory_aliases: {
                myAlias: '~/aliased/path'
            },
            plugins: {
                'my-plugin': 'myAlias:my-plugin.config.yaml'
            }
        };
        mockDependencies.loadYamlConfig.withArgs(FAKE_CONFIG_PATH).resolves(fakeYamlData);
        resolveAliasStub.withArgs('myAlias', '~/aliased/path').returns('/resolved/aliased/path');
        resolvePluginPathStub.withArgs('myAlias:my-plugin.config.yaml').returns('/resolved/plugin/path.config.yaml');

        // Act
        const result = await builder._getPluginRegistrationsFromFile(FAKE_CONFIG_PATH, '/path/to', 'Test Source');

        // Assert
        // 1. Verify that the file was loaded
        expect(mockDependencies.loadYamlConfig.calledWith(FAKE_CONFIG_PATH)).to.be.true;

        // 2. Verify the helpers were called
        expect(resolveAliasStub.calledOnce).to.be.true;
        expect(resolvePluginPathStub.calledOnce).to.be.true;

        // 3. Verify the final registration object is correct
        expect(result).to.have.property('my-plugin');
        expect(result['my-plugin'].configPath).to.equal('/resolved/plugin/path.config.yaml');
        expect(result['my-plugin'].sourceType).to.equal('Test Source');
    });
});
