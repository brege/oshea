// test/integration/plugins/plugin-registry-builder.test.1.2.8.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.8
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.8)', () => {

  let mockDependencies;
  let builderInstance;
  const FAKE_HOMEDIR = '/fake/user/home';
  const TEST_RAW_PATH = '~/my-plugin-config.yaml';
  const EXPECTED_RESOLVED_PATH = `${FAKE_HOMEDIR}/my-plugin-config.yaml`;

  beforeEach(() => {
    mockDependencies = {
      fs: {
        existsSync: sinon.stub().returns(true),
        statSync: sinon.stub().returns({ isFile: () => true, isDirectory: () => false }),
        readdirSync: sinon.stub().returns([])
      },
      fsPromises: {
        readFile: sinon.stub().resolves('{}')
      },
      path: {
        join: sinon.stub().callsFake((...args) => args.join('/')),
        resolve: sinon.stub().callsFake((...args) => args.join('/')),
        isAbsolute: sinon.stub().returns(false), // IMPORTANT: Simulate initially relative path
        dirname: sinon.stub().returns('/fake/dir'),
        basename: sinon.stub().returns('file.yaml'),
        extname: sinon.stub().returns('.yaml')
      },
      os: {
        homedir: sinon.stub().returns(FAKE_HOMEDIR),
        platform: sinon.stub().returns('linux')
      },
      loadYamlConfig: sinon.stub().resolves({}),
      yaml: {
        load: sinon.stub().returns({})
      },
      process: {
        env: { XDG_CONFIG_HOME: '/fake/xdg/config', ...process.env },
        cwd: sinon.stub().returns('/fake/cwd')
      },
      // Add the mandatory collRoot dependency
      collRoot: '/fake/coll-root'
    };

    builderInstance = new PluginRegistryBuilder(
      '/fake/project/root',
      null,
      null,
      false,
      false,
      null,
      null,
      mockDependencies
    );

    // Stub path.isAbsolute to return true for the final resolved path for _resolvePluginConfigPath
    mockDependencies.path.isAbsolute.withArgs(EXPECTED_RESOLVED_PATH).returns(true);

    // Reset the spy's call history AFTER the constructor runs for this nested suite
    mockDependencies.os.homedir.resetHistory();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should resolve a tilde-prefixed raw path to an absolute path in the user\'s home directory', () => {
    // Arrange
    const basePathForMainConfig = '/fake/main-config-dir';
    const currentAliases = {};

    // Act
    const resolvedPath = builderInstance._resolvePluginConfigPath(TEST_RAW_PATH, basePathForMainConfig, currentAliases);

    // Assert
    expect(mockDependencies.os.homedir.calledOnce).to.be.true;
    expect(resolvedPath).to.equal(EXPECTED_RESOLVED_PATH);
    expect(mockDependencies.fs.existsSync.calledWith(EXPECTED_RESOLVED_PATH)).to.be.true;
  });
});
