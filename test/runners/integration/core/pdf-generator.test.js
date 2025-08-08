// test/runners/integration/core/pdf-generator.test.js
require('module-alias/register');
const {
  projectRoot,
  pdfGeneratorPath,
  captureLogsPath,
  pdfGeneratorManifestPath,
  allPaths
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const { logs, clearLogs } = require(captureLogsPath);
const testManifest = require(pdfGeneratorManifestPath);
const proxyquire = require('proxyquire');

describe(`pdf-generator (Subsystem Integration Tests) ${path.relative(projectRoot, pdfGeneratorPath)}`, function() {
  let generatePdf;
  let mockPuppeteer;
  let sandbox;

  beforeEach(function() {
    clearLogs();
    sandbox = sinon.createSandbox();

    // Create the full mock object structure that puppeteer returns
    const mockPage = {
      setContent: sandbox.stub(),
      pdf: sandbox.stub(),
      close: sandbox.stub(),
    };

    const mockBrowser = {
      newPage: sandbox.stub().resolves(mockPage),
      close: sandbox.stub(),
    };

    // This is the object we will inject in place of the real 'puppeteer' module
    mockPuppeteer = {
      launch: sandbox.stub().resolves(mockBrowser),
      // Keep a reference to the nested mocks for easy access in assertions
      mockBrowser,
      mockPage
    };

    // Use proxyquire to inject the mocked puppeteer module and loggerPath
    const testLoggerPath = captureLogsPath;
    const { generatePdf: proxiedGeneratePdf } = proxyquire(pdfGeneratorPath, {
      'puppeteer': mockPuppeteer,
      '@paths': {
        ...allPaths, // Ensure other paths are preserved
        loggerPath: testLoggerPath
      }
    });
    generatePdf = proxiedGeneratePdf;
  });

  afterEach(function() {
    sandbox.restore();
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;

    it_(testCase.description, async function() {
      // Use per-test-case constants if provided, else fall back to defaults
      const constants = testCase.constants || {
        htmlBodyContent: '<p>Test</p>',
        outputPdfPath: '/tmp/test.pdf',
        pdfOptionsFromConfig: {
          format: 'A4',
          printBackground: true,
          scale: 0.95,
          margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
          displayHeaderFooter: true,
          headerTemplate: '<div>Header</div>',
          footerTemplate: '<div>Footer</div>',
        },
        cssFileContentsArray: ['body { color: blue; }'],
      };

      testCase.setup({ mockPuppeteer, mockPage: mockPuppeteer.mockPage }, constants);

      let result = null;
      try {
        result = await generatePdf(
          constants.htmlBodyContent, // Use as-is, including null/empty string!
          constants.outputPdfPath,
          constants.pdfOptionsFromConfig,
          constants.cssFileContentsArray
        );
      } catch (e) {
        result = e; // Capture thrown error for assertion
      }

      await testCase.assert(result, { mockPuppeteer, mockPage: mockPuppeteer.mockPage }, constants, expect, logs);
    });
  });
});

