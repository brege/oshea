// test/integration/collections/collections-manager.constructor.manifest.js
const { makeCollectionsManagerScenario } = require('./collections-manager.factory.js');
const path = require('path');

module.exports = [
  makeCollectionsManagerScenario({
    description: '2.1.1: should use XDG_DATA_HOME for collRoot if the environment variable is set',
    managerOptions: {},
    stubs: {
      process: {
        env: { XDG_DATA_HOME: '/fake/xdg_data_home' }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      const manager = result;
      const expectedPath = path.join('/fake/xdg_data_home', 'md-to-pdf', 'collections');
      expect(manager.collRoot).to.equal(expectedPath);
    },
  }),

  makeCollectionsManagerScenario({
    description: '2.1.1: should use the Linux/macOS default path when XDG_DATA_HOME is not set',
    managerOptions: {},
    stubs: {
      os: {
        platform: { returns: 'linux' },
        homedir: { returns: '/fake/home' }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      const manager = result;
      const expectedPath = path.join('/fake/home', '.local', 'share', 'md-to-pdf', 'collections');
      expect(manager.collRoot).to.equal(expectedPath);
    },
  }),

  makeCollectionsManagerScenario({
    description: '2.1.1: should use the Windows default path when XDG_DATA_HOME is not set and platform is win32',
    managerOptions: {},
    stubs: {
      os: {
        platform: { returns: 'win32' },
        homedir: { returns: 'C:\\Users\\Test' }
      },
      path: { // Stub path to handle Windows-style paths consistently
        join: (...args) => args.join('\\'),
        resolve: p => p,
        basename: p => p.split('\\').pop(),
        sep: '\\',
      },
    },
    assertion: (result, mocks, constants, expect) => {
      const manager = result;
      // The test runner uses path.join which will use the OS separator.
      // We need to construct the expected path in the same way.
      const expectedPath = path.join('C:\\Users\\Test', 'AppData', 'Local', 'md-to-pdf', 'collections');
      expect(manager.collRoot).to.equal(expectedPath);
    },
  }),

  makeCollectionsManagerScenario({
    description: '2.1.2: should prioritize collRootCliOverride over all other path settings',
    managerOptions: {
      collRootCliOverride: '/path/from/cli'
    },
    stubs: {
      process: {
        env: { XDG_DATA_HOME: '/should/be/ignored' }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      const manager = result;
      expect(manager.collRoot).to.equal('/path/from/cli');
    },
  }),
];
