// test/integration/plugins/plugin-registry-builder.resolve-plugin-config-path.manifest.js
const path = require('path');

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
};

module.exports = [
  {
    description: '1.2.7: Should correctly resolve an alias-prefixed raw path',
    methodName: '_resolvePluginConfigPath',
    methodArgs: [
      'my-alias:plugin-dir/plugin.config.yaml',
      '/irrelevant/base/path',
      { 'my-alias': '/path/to/aliased/dir' }
    ],
    setup: async (mocks, constants) => {
      const FINAL_RESOLVED_PATH = '/path/to/aliased/dir/plugin-dir/plugin.config.yaml';
      mocks.mockDependencies.path.join.callsFake((...args) => args.join('/'));
      mocks.mockDependencies.path.resolve.callsFake((...args) => args.join('/'));
      mocks.mockDependencies.path.isAbsolute.callsFake((p) => require('path').isAbsolute(p));
      mocks.mockDependencies.fs.existsSync.withArgs(FINAL_RESOLVED_PATH).returns(true);
      mocks.mockDependencies.fs.statSync.withArgs(FINAL_RESOLVED_PATH).returns({ isFile: () => true, isDirectory: () => false });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      const FINAL_RESOLVED_PATH = '/path/to/aliased/dir/plugin-dir/plugin.config.yaml';
      expect(result).to.equal(FINAL_RESOLVED_PATH);
      expect(logs).to.be.empty;
    },
  },
  {
    description: "1.2.8: Should resolve a tilde-prefixed raw path to an absolute path in the user's home directory",
    methodName: '_resolvePluginConfigPath',
    methodArgs: ['~/my-plugin'],
    setup: ({ mockDependencies }, constants) => {
      const expectedPath = path.join(constants.FAKE_HOME_DIR, 'my-plugin');
      mockDependencies.fs.existsSync.withArgs(expectedPath).returns(true);
      mockDependencies.fs.statSync.withArgs(expectedPath).returns({ isDirectory: () => false, isFile: () => true });
    },
    assert: async (result, { mockDependencies }, constants, expect) => {
      const expectedPath = path.join(constants.FAKE_HOME_DIR, 'my-plugin');
      expect(result).to.equal(expectedPath);
      sinon.assert.calledOnce(mockDependencies.os.homedir);
    },
  }
];
