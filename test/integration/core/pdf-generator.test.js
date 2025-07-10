// test/integration/core/pdf-generator.test.js
const { pdfGeneratorPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const { logs, testLogger, clearLogs } = require('../../shared/capture-logs');
const testManifest = require('./pdf-generator.manifest');
const proxyquire = require('proxyquire');

describe('pdf_generator (Integration Tests)', function () {
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

    // Use proxyquire to inject the mocked puppeteer module
    const { generatePdf: proxiedGeneratePdf } = proxyquire(pdfGeneratorPath, {
      'puppeteer': mockPuppeteer,
      '@paths': {
        ...require('@paths'), // Ensure other paths are preserved
        logger: testLogger
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

      // Debug: show what is being passed for htmlBodyContent
      // console.log('Running', testCase.description, 'with htmlBodyContent:', JSON.stringify(constants.htmlBodyContent));

      testCase.setup({ mockPuppeteer, mockPage: mockPuppeteer.mockPage }, constants);

      let result = null;
      try {
        await generatePdf(
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

