// test/integration/plugins/plugin_determiner.test.js
const { pluginDeterminerPath } = require('@paths');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// Import the manifest containing test cases
const testManifest = require('./plugin_determiner.manifest');

describe('determinePluginToUse (Module Integration Tests)', function() {
  let determinePluginToUse; // Declare it here to be assigned in beforeEach
  let mockFsPromises;
  let mockFsSync;
  let mockPath;
  let mockYaml;
  let mockMarkdownUtils;
  let mockProcessCwd; // This will now refer to the stubbed process.cwd
  let dependencies; // This object will be passed to determinePluginToUse
  let consoleLogStub;
  let consoleWarnStub;

  const commonTestConstants = {
    DUMMY_MARKDOWN_FILE_PATH: '/test/path/to/my-document.md',
    DUMMY_LOCAL_CONFIG_FILE_PATH: '/test/path/to/my-document.config.yaml',
    DUMMY_MARKDOWN_FILENAME: 'my-document.md', // Base filename for source string assertion
  };

  beforeEach(function() {
    // Clear module cache for plugin_determiner *before* stubbing globals.
    delete require.cache[require.resolve('../../../src/plugins/plugin_determiner')];

    // Setup all mocks *before* re-requiring the module under test
    mockFsPromises = { readFile: sinon.stub(), };
    mockFsSync = { existsSync: sinon.stub().returns(false), statSync: sinon.stub(), };

    // Explicitly stub path.resolve as well for diagnostic purposes.
    mockPath = {
      resolve: sinon.stub().callsFake((...args) => require('path').resolve(...args)),
      dirname: require('path').dirname,
      basename: require('path').basename,
      extname: require('path').extname,
      join: require('path').join,
    };

    mockYaml = { load: sinon.stub(), };
    mockMarkdownUtils = { extractFrontMatter: sinon.stub(), };

    // Stub global process.cwd directly and ensure it calls through
    mockProcessCwd = sinon.stub(process, 'cwd').callThrough();

    // Assemble dependencies object with all the mocks
    dependencies = {
      fsPromises: mockFsPromises, fsSync: mockFsSync, path: mockPath,
      yaml: mockYaml, markdownUtils: mockMarkdownUtils, processCwd: mockProcessCwd,
    };

    // Re-require determinePluginToUse *after* mocks (especially global ones) are set up.
    determinePluginToUse = require(pluginDeterminerPath).determinePluginToUse;

    // Setup console stubs after all other setup.
    consoleLogStub = sinon.stub(console, 'log');
    consoleWarnStub = sinon.stub(console, 'warn');
    console.lastLog = '';
  });

  afterEach(function() {
    consoleLogStub.restore();
    consoleWarnStub.restore();
    mockProcessCwd.restore(); // Restore global process.cwd stub
    delete process.env.DEBUG_PLUGIN_DETERMINER; // Clean up environment variable
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(`${testCase.describe}`, async function() {
      const currentMocks = {
        mockFsPromises, mockFsSync, mockPath, mockYaml, mockMarkdownUtils, mockProcessCwd,
        consoleLogStub, consoleWarnStub,
      };

      if (testCase.setup) {
        await testCase.setup(testCase.args, currentMocks, commonTestConstants);
      }

      const result = await determinePluginToUse(testCase.args, dependencies, testCase.defaultPluginName || 'default');

      await testCase.assert(result, testCase.args, currentMocks, commonTestConstants, expect);
    });
  });
});
