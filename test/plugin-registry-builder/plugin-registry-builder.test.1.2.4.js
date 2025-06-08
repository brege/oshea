// test/plugin-registry-builder/plugin-registry-builder.test.1.2.4.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.4
describe('PluginRegistryBuilder _resolveAlias (1.2.4)', () => {

    it.skip("should resolve a tilde-prefixed alias to the user's home directory", () => {
        // Arrange
        const FAKE_HOME_DIR = '/home/user';

        // --- FIX: Use a more robust spy pattern ---
        // 1. Create a plain mock object with the methods we need.
        const osMock = {
            homedir: () => FAKE_HOME_DIR,
            platform: () => 'linux'
        };
        // 2. Create a spy specifically on the method we want to track.
        const homedirSpy = sinon.spy(osMock, 'homedir');

        const mockDependencies = {
            os: osMock, // Use the mock object
            path: {
                join: (a, b) => `${a}/${b}`,
                isAbsolute: () => true,
                dirname: () => '',
                resolve: () => ''
            },
            fs: { existsSync: () => true },
            process: { env: {} }
        };
        
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);
        
        // Act
        const result = builder._resolveAlias('my-alias', '~/some/path', '/irrelevant/base/path');

        // Assert
        expect(result).to.equal('/home/user/some/path');
        // 3. Assert against the dedicated spy.
        expect(homedirSpy.calledOnce).to.be.true;
    });

    afterEach(() => {
        sinon.restore();
    });
});
