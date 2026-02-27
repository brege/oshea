// test/runners/integration/core/default-handler.test.js
require('module-alias/register');
const {
  projectRoot,
  defaultHandlerManifestPath,
  defaultHandlerPath,
  allPaths,
  captureLogsPath,
} = require('@paths');
const { expect } = require('chai');
const { logs, clearLogs } = require(captureLogsPath);
const proxyquire = require('proxyquire');
const testManifest = require(defaultHandlerManifestPath);
const testLoggerPath = captureLogsPath;

function collectStubs(ctx) {
  // List all stub names as set up in test/setup.js
  return {
    generatePdfStub: ctx.generatePdfStub,
    extractFrontMatterStub: ctx.extractFrontMatterStub,
    removeShortcodesStub: ctx.removeShortcodesStub,
    renderMarkdownToHtmlStub: ctx.renderMarkdownToHtmlStub,
    generateSlugStub: ctx.generateSlugStub,
    substituteAllPlaceholdersStub: ctx.substituteAllPlaceholdersStub,
    getMathCssContentStub: ctx.getMathCssContentStub,
    configureMarkdownItForMathStub: ctx.configureMarkdownItForMathStub,
    readFileStub: ctx.readFileStub,
    mkdirStub: ctx.mkdirStub,
    existsSyncStub: ctx.existsSyncStub,
  };
}

describe(`default-handler (Subsystem Integration Tests) ${path.relative(projectRoot, defaultHandlerPath)}`, () => {
  let DefaultHandler;

  beforeEach(() => {
    clearLogs();
    // Clear the require cache for the handler so it picks up fresh stubs
    delete require.cache[require.resolve(defaultHandlerPath)];
    // Use proxyquire to inject loggerPath for log capturing
    DefaultHandler = proxyquire(defaultHandlerPath, {
      '@paths': { ...allPaths, loggerPath: testLoggerPath },
    });
  });

  testManifest.forEach((testCase) => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(testCase.description, async function () {
      const stubs = collectStubs(this);
      testCase.setup(DefaultHandler, stubs);
      const defaultHandler = new DefaultHandler();
      const result = await defaultHandler.generate(
        testCase.data,
        testCase.pluginSpecificConfig,
        testCase.globalConfig,
        testCase.outputDir,
        testCase.outputFilenameOpt,
        testCase.pluginBasePath,
      );

      testCase.assert(result, stubs, expect, logs);
    });
  });
});
