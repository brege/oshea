// test/integration/plugins/plugin-registry-builder.test.1.2.10.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.10
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.10)', () => {

  it('should identify the conventional config file when a directory path is provided', () => {
    // Arrange
    const PLUGIN_DIR_PATH = '/path/to/my-plugin';
    const DIR_BASENAME = 'my-plugin';
    const CONVENTIONAL_CONFIG_PATH = '/path/to/my-plugin/my-plugin.config.yaml';

    const statSyncStub = sinon.stub();
    // The initial path is a directory
    statSyncStub.withArgs(PLUGIN_DIR_PATH).returns({ isDirectory: () => true, isFile: () => false });
    // The conventional config path within that directory is a file
    statSyncStub.withArgs(CONVENTIONAL_CONFIG_PATH).returns({ isDirectory: () => false, isFile: () => true });

    const mockDependencies = {
      os: {
        homedir: () => '/fake/home',
        platform: () => 'linux'
      },
      path: {
        join: (a, b) => `${a}/${b}`,
        isAbsolute: () => true,
        dirname: () => '',
        resolve: () => '',
        basename: sinon.stub().withArgs(PLUGIN_DIR_PATH).returns(DIR_BASENAME)
      },
      fs: {
        existsSync: sinon.stub().returns(true),
        statSync: statSyncStub
      },
      process: { env: {} },
      // Add the mandatory collRoot dependency
      collRoot: '/fake/coll-root'
    };

    const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

    // Act
    const result = builder._resolvePluginConfigPath(PLUGIN_DIR_PATH, null, null);

    // Assert
    // Verify the final result is the path to the conventional config file
    expect(result).to.equal(CONVENTIONAL_CONFIG_PATH);

    // Verify that the file system was checked for both the directory and the file within it
    expect(mockDependencies.fs.existsSync.calledWith(PLUGIN_DIR_PATH)).to.be.true;
    expect(mockDependencies.fs.existsSync.calledWith(CONVENTIONAL_CONFIG_PATH)).to.be.true;
  });

  afterEach(() => {
    sinon.restore();
  });
});
