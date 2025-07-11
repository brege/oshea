// test/integration/core/default-handler.test.js

const { expect } = require('chai');
const { logs, clearLogs } = require('../../shared/capture-logs');
const path = require('path');
const proxyquire = require('proxyquire');
const testManifest = require('./default-handler.manifest.js');
const defaultHandlerPath = require('@paths').defaultHandlerPath;
const allPaths = require('@paths');

// Point loggerPath to capture-logs.js
const testLoggerPath = path.resolve(__dirname, '../../shared/capture-logs.js');

function collectStubs(ctx) {
  // List all stub names as set up in test/setup.js
  return {
    generatePdfStub: ctx.generatePdfStub,
    extractFrontMatterStub: ctx.extractFrontMatterStub,
    removeShortcodesStub: ctx.removeShortcodesStub,
    renderMarkdownToHtmlStub: ctx.renderMarkdownToHtmlStub,
    generateSlugStub: ctx.generateSlugStub,
    ensureAndPreprocessHeadingStub: ctx.ensureAndPreprocessHeadingStub,
    substituteAllPlaceholdersStub: ctx.substituteAllPlaceholdersStub,
    getMathCssContentStub: ctx.getMathCssContentStub,
    configureMarkdownItForMathStub: ctx.configureMarkdownItForMathStub,
    readFileStub: ctx.readFileStub,
    mkdirStub: ctx.mkdirStub,
    existsSyncStub: ctx.existsSyncStub,
  };
}

describe('DefaultHandler (Integration Tests)', function () {
  let DefaultHandler;

  beforeEach(function () {
    clearLogs();
    // Clear the require cache for the handler so it picks up fresh stubs
    delete require.cache[require.resolve(defaultHandlerPath)];
    // Use proxyquire to inject loggerPath for log capturing
    DefaultHandler = proxyquire(defaultHandlerPath, {
      '@paths': { ...allPaths, loggerPath: testLoggerPath }
    });
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(testCase.description, async function () {
      // Collect stubs from the Mocha context for this test
      const stubs = collectStubs(this);

      // Set up stubs for this test case
      testCase.setup(DefaultHandler, stubs);

      const defaultHandler = new DefaultHandler();

      const result = await defaultHandler.generate(
        testCase.data,
        testCase.pluginSpecificConfig,
        testCase.globalConfig,
        testCase.outputDir,
        testCase.outputFilenameOpt,
        testCase.pluginBasePath
      );

      testCase.assert(result, stubs, expect, logs);
    });
  });
});

