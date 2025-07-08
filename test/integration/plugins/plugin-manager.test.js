// test/integration/plugins/plugin-manager.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pluginManagerPath } = require('@paths');
const { logs, testLogger, clearLogs } = require('../../shared/capture-logs');
const testManifest = require('./plugin-manager.manifest.js');

describe('PluginManager Tests (1.5.x)', function() {
  let tempDir;
  let originalPathsModule;
  let PluginManager;

  before(function() {
    originalPathsModule = require.cache[require.resolve('@paths')];
  });

  beforeEach(function() {
    clearLogs();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-manager-test-'));

    // Inject test logger
    delete require.cache[pluginManagerPath];
    delete require.cache[require.resolve('@paths')];
    require.cache[require.resolve('@paths')] = {
      exports: { ...originalPathsModule.exports, logger: testLogger }
    };
    PluginManager = require(pluginManagerPath);
  });

  afterEach(function() {
    fs.rmSync(tempDir, { recursive: true, force: true });
    sinon.restore();
    // Restore original @paths module
    require.cache[require.resolve('@paths')] = originalPathsModule;
    delete require.cache[pluginManagerPath];
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      setup,
      assert,
      isNegativeTest,
      expectedErrorMessage,
      ...scenarioConfig
    } = testCase;

    it_(description, async function() {
      const mocks = { handlerScriptPath: null };
      const constants = { tempDir };
      const pluginManager = new PluginManager();

      if (isNegativeTest) {
          try {
              await pluginManager.invokeHandler(
                  'test-plugin',
                  { ...scenarioConfig.effectiveConfig, handlerScriptPath: mocks.handlerScriptPath },
                  scenarioConfig.data,
                  scenarioConfig.outputDir,
                  scenarioConfig.outputFilenameOpt
              );
              // If it reaches here, the expected error was not thrown.
              throw new Error('Expected an error to be thrown, but it was not.');
          } catch (error) {
              expect(error).to.be.an.instanceOf(Error);
              expect(error.message).to.match(expectedErrorMessage);
          }
          return;
      }
      
      await setup(mocks, constants);
      
      const result = await pluginManager.invokeHandler(
        'test-plugin',
        { ...scenarioConfig.effectiveConfig, handlerScriptPath: mocks.handlerScriptPath },
        scenarioConfig.data,
        scenarioConfig.outputDir,
        scenarioConfig.outputFilenameOpt
      );

      if (assert) {
        await assert(result, mocks, constants, expect, logs);
      }
    });
  });
});
