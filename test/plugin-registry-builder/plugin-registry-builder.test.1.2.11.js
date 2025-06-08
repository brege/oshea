// test/plugin-registry-builder/plugin-registry-builder.test.1.2.11.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.11
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.11)', () => {

    it('should find an alternative *.config.yaml file if the conventional one is not present', () => {
        // Arrange
        const PLUGIN_DIR_PATH = '/path/to/my-plugin';
        const CONVENTIONAL_CONFIG_PATH = '/path/to/my-plugin/my-plugin.config.yaml';
        const ALTERNATIVE_CONFIG_NAME = 'alternative-name.config.yaml';
        const ALTERNATIVE_CONFIG_PATH = '/path/to/my-plugin/alternative-name.config.yaml';

        // --- FIX: Create highly explicit stubs for every filesystem interaction ---
        const existsSyncStub = sinon.stub();
        const statSyncStub = sinon.stub();
        const readdirSyncStub = sinon.stub();

        // 1. The initial path is a directory that exists.
        existsSyncStub.withArgs(PLUGIN_DIR_PATH).returns(true);
        statSyncStub.withArgs(PLUGIN_DIR_PATH).returns({ isDirectory: () => true, isFile: () => false });

        // 2. The conventionally named config file does NOT exist.
        existsSyncStub.withArgs(CONVENTIONAL_CONFIG_PATH).returns(false);

        // 3. The directory contents include an alternative config file.
        readdirSyncStub.withArgs(PLUGIN_DIR_PATH).returns(['index.js', ALTERNATIVE_CONFIG_NAME]);
        
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: {
                join: (a, b) => `${a}/${b}`,
                isAbsolute: () => true,
                dirname: () => '',
                resolve: () => '',
                basename: () => 'my-plugin'
            },
            fs: {
                existsSync: existsSyncStub,
                statSync: statSyncStub,
                readdirSync: readdirSyncStub
            },
            process: { env: {} }
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = builder._resolvePluginConfigPath(PLUGIN_DIR_PATH, null, null);

        // Assert
        expect(result).to.equal(ALTERNATIVE_CONFIG_PATH);
    });
    
    afterEach(() => {
        sinon.restore();
    });
});
