// test/integration/plugins/plugin-registry-builder.resolve-alias.manifest.js
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
    description: "1.2.4: Should resolve a tilde-prefixed alias value to an absolute path in the user's home directory",
    methodName: '_resolveAlias',
    methodArgs: [
      'myAlias',
      '~/some/path',
      '/fake/config-base'
    ],
    assert: async (result, { mockDependencies }, constants, expect) => {
      const expectedPath = path.join(constants.FAKE_HOME_DIR, 'some/path');
      expect(result).to.equal(expectedPath);
      sinon.assert.calledOnce(mockDependencies.os.homedir);
    },
  },  
  {
    description: '1.2.5: Should resolve a relative alias value against the provided base path',
    methodName: '_resolveAlias',
    methodArgs: [
      'my-alias',
      './relative/path',
      '/path/to/config/dir'
    ],
    setup: async (mocks, constants) => {
      const FAKE_BASE_PATH = '/path/to/config/dir';
      const FAKE_RESOLVED_PATH = '/path/to/config/dir/relative/path';
      mocks.mockDependencies.path.isAbsolute.returns(false);
      mocks.mockDependencies.path.resolve.returns(FAKE_RESOLVED_PATH);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      const FAKE_BASE_PATH = '/path/to/config/dir';
      const FAKE_RESOLVED_PATH = '/path/to/config/dir/relative/path';
      expect(result).to.equal(FAKE_RESOLVED_PATH);
      expect(mocks.mockDependencies.path.resolve.calledWith(FAKE_BASE_PATH, './relative/path')).to.be.true;
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.6: Should return null for a null aliasValue',
    methodName: '_resolveAlias',
    methodArgs: ['my-alias', null, '/some/base'],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.path.isAbsolute.returns(false);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.null;
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.6: Should return null for an empty string aliasValue',
    methodName: '_resolveAlias',
    methodArgs: ['my-alias', '   ', '/some/base'],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.path.isAbsolute.returns(false);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.null;
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.6: Should return null for a relative path when basePathDefiningAlias is missing',
    methodName: '_resolveAlias',
    methodArgs: ['my-alias', './relative/path', null],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.path.isAbsolute.returns(false);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.null;
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Cannot resolve relative alias target '.\/relative\/path' for alias 'my-alias' because the base path of the config file defining it is unknown./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
];
