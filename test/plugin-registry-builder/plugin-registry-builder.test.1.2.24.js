// test/plugin-registry-builder/plugin-registry-builder.test.1.2.24.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.24
describe('PluginRegistryBuilder buildRegistry (1.2.24)', () => {
    it.skip("should return a cached registry on a second call", async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => 'config.example.yaml' },
            fs: { existsSync: sinon.stub().returns(true) },
            process: { env: {} },
            loadYamlConfig: sinon.stub().resolves({})
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Spy on a method deep inside the build process to see if it's called
        const getFromFileSpy = sinon.spy(builder, '_getPluginRegistrationsFromFile');
        
        // Act
        await builder.buildRegistry(); // First call, should call the spy
        await builder.buildRegistry(); // Second call, should hit the cache

        // Assert
        // Verify the internal method was only called on the first run.
        expect(getFromFileSpy.callCount).to.equal(1);
    });

    afterEach(() => {
        sinon.restore();
    });
});
