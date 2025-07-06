// test/integration/plugins/plugin-registry-builder.test.1.2.16.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.16
describe('PluginRegistryBuilder _getPluginRegistrationsFromFile (1.2.16)', () => {

  it('should handle invalid YAML gracefully and return an empty object', async () => {
    // Arrange
    const FAKE_CONFIG_PATH = '/path/to/bad.yaml';
    const mockDependencies = {
      os: { homedir: () => '/fake/home', platform: () => 'linux' },
      path: { join: (a, b) => `${a}/${b}`, dirname: () => '', resolve: () => '' },
      fs: { existsSync: sinon.stub().withArgs(FAKE_CONFIG_PATH).returns(true) },
      process: { env: {} },
      // --- Key for this test: The YAML loader throws an error ---
      loadYamlConfig: sinon.stub().withArgs(FAKE_CONFIG_PATH).rejects(new Error('Malformed YAML')),
      // Add the mandatory collRoot dependency
      collRoot: '/fake/coll-root'
    };
    const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

    // Act
    const result = await builder._getPluginRegistrationsFromFile(FAKE_CONFIG_PATH, '/path/to', 'Test');

    // Assert
    expect(result).to.be.an('object').that.is.empty;
  });

  afterEach(() => {
    sinon.restore();
  });
});
