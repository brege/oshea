// test/integration/plugins/plugin-registry-builder.test.1.2.17.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.17
describe('PluginRegistryBuilder _getPluginRegistrationsFromFile (1.2.17)', () => {

    it('should use resolved aliases when resolving plugin paths in the same file', async () => {
        // Arrange
        const FAKE_CONFIG_PATH = '/path/to/main.yaml';
        const BASE_PATH = '/path/to';
        const RESOLVED_ALIAS_PATH = '/path/to/aliased-path';
        const FINAL_PLUGIN_PATH = '/path/to/aliased-path/plugin.config.yaml';

        const mockDependencies = {
            os: { homedir: () => '', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', resolve: () => '' },
            fs: { existsSync: sinon.stub().returns(true) },
            process: { env: {} },
            loadYamlConfig: sinon.stub().resolves({
                plugin_directory_aliases: { 'my-alias': './aliased-path' },
                plugins: { 'my-plugin': 'my-alias:plugin.config.yaml' }
            }),
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Stub the helper methods to isolate the orchestration logic
        const resolveAliasStub = sinon.stub(builder, '_resolveAlias').returns(RESOLVED_ALIAS_PATH);
        const resolvePluginPathStub = sinon.stub(builder, '_resolvePluginConfigPath').returns(FINAL_PLUGIN_PATH);

        // Act
        const result = await builder._getPluginRegistrationsFromFile(FAKE_CONFIG_PATH, BASE_PATH, 'Test Source');

        // Assert
        // 1. Verify that _resolveAlias was called correctly.
        expect(resolveAliasStub.calledWith('my-alias', './aliased-path', BASE_PATH)).to.be.true;

        // 2. Verify that _resolvePluginConfigPath was called with the map of resolved aliases.
        const expectedAliasesMap = { 'my-alias': RESOLVED_ALIAS_PATH };
        expect(resolvePluginPathStub.calledWith(
            'my-alias:plugin.config.yaml',
            BASE_PATH,
            sinon.match(expectedAliasesMap) // Check that the resolved alias was passed in
        )).to.be.true;

        // 3. Verify the final result is correct.
        expect(result['my-plugin'].configPath).to.equal(FINAL_PLUGIN_PATH);
    });

    afterEach(() => {
        sinon.restore();
    });
});
