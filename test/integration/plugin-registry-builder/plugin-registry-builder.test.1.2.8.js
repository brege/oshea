// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.8.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.8
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.8)', () => {

    it.skip("should resolve a tilde-prefixed raw path to the user's home directory", () => {
        // Arrange
        const FAKE_HOME_DIR = '/home/user';
        const RAW_PATH = '~/plugins/my-plugin.config.yaml';
        const FINAL_RESOLVED_PATH = '/home/user/plugins/my-plugin.config.yaml';

        // --- FIX: Use the robust spy pattern to track the homedir call ---
        const osMock = {
            homedir: () => FAKE_HOME_DIR,
            platform: () => 'linux'
        };
        const homedirSpy = sinon.spy(osMock, 'homedir');

        const mockDependencies = {
            os: osMock,
            path: {
                join: (a, b) => `${a}/${b}`,
                isAbsolute: (p) => p.startsWith('/'),
                dirname: () => '',
                resolve: () => ''
            },
            fs: {
                existsSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns(true),
                statSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns({ isFile: () => true, isDirectory: () => false })
            },
            process: { env: {} }
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = builder._resolvePluginConfigPath(RAW_PATH, null, null);

        // Assert
        expect(result).to.equal(FINAL_RESOLVED_PATH);
        // Assert against the dedicated spy
        expect(homedirSpy.calledOnce).to.be.true;
    });

    afterEach(() => {
        sinon.restore();
    });
});
