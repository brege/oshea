// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.7.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.7
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.7)', () => {

    it('should correctly resolve an alias-prefixed raw path', () => {
        // Arrange
        const ALIAS_NAME = 'my-alias';
        const ALIAS_TARGET_PATH = '/path/to/aliased/dir';
        const RAW_PATH = 'my-alias:plugin-dir/plugin.config.yaml';
        const FINAL_RESOLVED_PATH = '/path/to/aliased/dir/plugin-dir/plugin.config.yaml';

        const mockDependencies = {
            os: {
                homedir: () => '/fake/home',
                platform: () => 'linux'
            },
            path: {
                join: (a, b) => `${a}/${b}`,
                dirname: () => '',
                resolve: () => '',
                isAbsolute: () => true, // The resolved alias path is absolute
                basename: () => ''
            },
            fs: {
                // The final resolved path must exist and be a file
                existsSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns(true),
                statSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns({ isFile: () => true, isDirectory: () => false })
            },
            process: { env: {} }
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        const currentAliases = {
            [ALIAS_NAME]: ALIAS_TARGET_PATH
        };

        // Act
        const result = builder._resolvePluginConfigPath(RAW_PATH, '/irrelevant/base/path', currentAliases);

        // Assert
        expect(result).to.equal(FINAL_RESOLVED_PATH);
    });
});
