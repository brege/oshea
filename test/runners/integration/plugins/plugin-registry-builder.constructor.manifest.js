// test/runners/integration/plugins/plugin-registry-builder.constructor.manifest.js

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
};

module.exports = [
  {
    description: '1.2.1: Should correctly initialize paths using default OS home directory',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT,
      null,
      commonTestConstants.FAKE_MANIFEST_PATH,
      false, false, null, null
    ],
    setup: async (mocks, constants) => {},
    assert: async (builder, mocks, constants, expect, logs) => {
      expect(builder.projectRoot).to.equal(constants.FAKE_PROJECT_ROOT);
      expect(builder.projectManifestConfigPath).to.equal(constants.FAKE_MANIFEST_PATH);
      expect(builder.projectManifestBaseDir).to.equal(constants.FAKE_MANIFEST_DIR);
      expect(builder.xdgBaseDir).to.equal(`${constants.FAKE_HOME_DIR}/.config/oshea`);
      expect(logs.length).to.be.greaterThan(0);
      expect(logs.some(log => log.level === 'debug')).to.be.true;
    },
  },
  {
    description: '1.2.1: Should correctly initialize paths using the XDG_CONFIG_HOME environment variable when set',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT,
      null,
      commonTestConstants.FAKE_MANIFEST_PATH,
      false, false, null, null
    ],
    setup: async (mocks, constants) => {
      const FAKE_XDG_CONFIG_HOME = '/fake/xdg_config';
      mocks.mockDependencies.process.env.XDG_CONFIG_HOME = FAKE_XDG_CONFIG_HOME;
    },
    assert: async (builder, mocks, constants, expect, logs) => {
      const FAKE_XDG_CONFIG_HOME = '/fake/xdg_config';
      expect(builder.xdgBaseDir).to.equal(`${FAKE_XDG_CONFIG_HOME}/oshea`);
      expect(logs.length).to.be.greaterThan(0);
      expect(logs.some(log => log.level === 'debug')).to.be.true;
    },
  },
  {
    description: '1.2.2: Should throw an error if projectRoot is not provided (null)',
    constructorArgs: [
      null, null, null, false, false, null, null
    ],
    isNegativeTest: true,
    expectedErrorMessage: 'PluginRegistryBuilder: projectRoot must be a valid path string.',
    assert: async (builder, mocks, constants, expect, logs) => {
    },
  },
  {
    description: '1.2.2: Should throw an error if projectRoot is not provided (undefined)',
    constructorArgs: [
      undefined, null, null, false, false, null, null
    ],
    isNegativeTest: true,
    expectedErrorMessage: 'PluginRegistryBuilder: projectRoot must be a valid path string.',
    assert: async (builder, mocks, constants, expect, logs) => {
    },
  },
  {
    description: '1.2.2: Should throw an error if projectRoot is not a string',
    constructorArgs: [
      12345, null, null, false, false, null, null
    ],
    isNegativeTest: true,
    expectedErrorMessage: 'PluginRegistryBuilder: projectRoot must be a valid path string.',
    assert: async (builder, mocks, constants, expect, logs) => {
    },
  },
  {
    description: '1.2.3: Should determine cmCollRoot based on XDG_DATA_HOME when set',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null,
    ],
    setup: async (mocks, constants) => {},
    assert: async (builder, mocks, constants, expect, logs) => {
      expect(builder.cmCollRoot).to.equal(constants.FAKE_COLL_ROOT);
      expect(logs.length).to.be.greaterThan(0);
      expect(logs.some(log => log.level === 'debug')).to.be.true;
    },
  },
  {
    description: '1.2.3: Should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Linux)',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null,
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.os.platform.returns('linux');
    },
    assert: async (builder, mocks, constants, expect, logs) => {
      expect(builder.cmCollRoot).to.equal(constants.FAKE_COLL_ROOT);
      expect(logs.length).to.be.greaterThan(0);
      expect(logs.some(log => log.level === 'debug')).to.be.true;
    },
  },
  {
    description: '1.2.3: Should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Windows)',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null,
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.os.platform.returns('win32');
    },
    assert: async (builder, mocks, constants, expect, logs) => {
      expect(builder.cmCollRoot).to.equal(constants.FAKE_COLL_ROOT);
      expect(logs.length).to.be.greaterThan(0);
      expect(logs.some(log => log.level === 'debug')).to.be.true;
    },
  },
];
