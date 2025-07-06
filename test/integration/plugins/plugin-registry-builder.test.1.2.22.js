// test/integration/plugins/plugin-registry-builder.test.1.2.22.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.22
describe('PluginRegistryBuilder buildRegistry (1.2.22)', () => {
  it('should only load from auto-discovered plugins when useFactoryDefaultsOnly is true', async () => {
    // Arrange
    const mockDependencies = {
      os: { homedir: () => '', platform: () => 'linux' },
      path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => 'config.example.yaml', resolve: (p) => p },
      fs: {
        existsSync: sinon.stub().returns(false), // Assume no config files exist
        statSync: sinon.stub().returns({ isDirectory: () => true }),
        promises: { readdir: sinon.stub().resolves([]) }
      },
      process: { env: {} },
      collRoot: '/fake/coll-root'
    };
    const builder = new PluginRegistryBuilder('/fake/project', null, null, true, false, null, null, mockDependencies);

    // Stub the new primary method and the methods that should NOT be called
    const registerBundledStub = sinon.stub(builder, '_registerBundledPlugins').resolves({ 'bundled-plugin': {} });
    const getFromFileStub = sinon.stub(builder, '_getPluginRegistrationsFromFile');
    const getFromCmStub = sinon.stub(builder, '_getPluginRegistrationsFromCmManifest');

    // Act
    const result = await builder.buildRegistry();

    // Assert
    // 1. Verify that auto-discovery was the only source consulted.
    expect(registerBundledStub.calledOnce).to.be.true;
    expect(getFromFileStub.notCalled).to.be.true;
    expect(getFromCmStub.notCalled).to.be.true;

    // 2. Verify the result is from the auto-discovery call.
    expect(result).to.have.property('bundled-plugin');
    expect(Object.keys(result).length).to.equal(1);
  });

  afterEach(() => {
    sinon.restore();
  });
});
