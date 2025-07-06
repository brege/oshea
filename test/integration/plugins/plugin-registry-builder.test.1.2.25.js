// test/integration/plugins/plugin-registry-builder.test.1.2.25.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.25
describe('PluginRegistryBuilder buildRegistry (1.2.25)', () => {
  it('should include CM plugins when no CM instance is provided', async () => {
    // Arrange
    const mockDependencies = {
      os: { homedir: () => '', platform: () => 'linux' },
      path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '', resolve: (p) => p },
      fs: {
        existsSync: sinon.stub().returns(true),
        statSync: sinon.stub().returns({ isDirectory: () => true }),
        promises: { readdir: sinon.stub().resolves([]) }
      },
      process: { env: {} },
      collRoot: '/fake/coll-root'
    };
    // --- Key for this test: collectionsManagerInstance is null ---
    const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

    // Stub all potential plugin sources
    const getFromCmStub = sinon.stub(builder, '_getPluginRegistrationsFromCmManifest').resolves({ 'my-cm-plugin': {} });
    sinon.stub(builder, '_getPluginRegistrationsFromFile').resolves({});
    sinon.stub(builder, '_registerBundledPlugins').resolves({}); // Add this stub

    // Act
    const result = await builder.buildRegistry();

    // Assert
    expect(getFromCmStub.calledOnce).to.be.true;
    expect(result).to.have.property('my-cm-plugin');
  });

  afterEach(() => {
    sinon.restore();
  });
});
