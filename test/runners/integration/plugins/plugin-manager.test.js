// test/runners/integration/plugins/plugin-manager.test.js
require('module-alias/register');
const {
  pluginManagerPath,
  pluginManagerManifestPath,
  captureLogsPath,
  projectRoot,
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logs, clearLogs } = require(captureLogsPath);
const testManifest = require(pluginManagerManifestPath);

describe(`plugin-manager (Module Integration Tests) ${path.relative(projectRoot, pluginManagerPath)}`, () => {
  let tempDir;
  let originalPathsModule;
  let PluginManager;

  beforeEach(() => {
    clearLogs();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-manager-test-'));

    const pathsPath = require.resolve('@paths');
    originalPathsModule = require.cache[pathsPath];
    delete require.cache[pluginManagerPath];
    delete require.cache[pathsPath];

    // Inject loggerPath for log capturing
    const testLoggerPath = captureLogsPath;
    require.cache[pathsPath] = {
      exports: { ...require(pathsPath), loggerPath: testLoggerPath },
    };

    PluginManager = require(pluginManagerPath);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    sinon.restore();
    if (originalPathsModule) {
      require.cache[require.resolve('@paths')] = originalPathsModule;
    }
    delete require.cache[pluginManagerPath];
  });

  testManifest.forEach((testCase) => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      setup,
      assert,
      isNegativeTest,
      expectedErrorMessage,
      ...scenarioConfig
    } = testCase;

    it_(description, async () => {
      const mocks = { handlerScriptPath: null };
      const constants = { tempDir };
      const pluginManager = new PluginManager();

      if (isNegativeTest) {
        try {
          await pluginManager.invokeHandler(
            'test-plugin',
            {
              ...scenarioConfig.effectiveConfig,
              handlerScriptPath: mocks.handlerScriptPath,
            },
            scenarioConfig.data,
            scenarioConfig.outputDir,
            scenarioConfig.outputFilenameOpt,
          );
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
        {
          ...scenarioConfig.effectiveConfig,
          handlerScriptPath: mocks.handlerScriptPath,
        },
        scenarioConfig.data,
        scenarioConfig.outputDir,
        scenarioConfig.outputFilenameOpt,
      );

      if (assert) {
        await assert(result, mocks, constants, expect, logs);
      }
    });
  });
});
