// test/setup.js
require('module-alias/register');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;
const fss = require('fs');

const {
  markdownUtilsPath,
  pdfGeneratorPath,
  mathIntegrationPath,
  defaultHandlerPath
} = require('@paths');

// Require all modules that will be stubbed globally
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);
const createMathIntegration = require(mathIntegrationPath);

// Import the test logger for capturing logs
const { testLogger } = require('./shared/capture-logs');

// Make these globally available in the test context
global.expect = expect;
global.sinon = sinon;
global.path = path;

// Export mochaHooks to correctly register global hooks
module.exports = {
  mochaHooks: {
    beforeEach(done) {
      // Create a Sinon sandbox for this test's stubs to ensure proper restoration
      this.sandbox = sinon.createSandbox();

      // Stub all external dependencies that the DefaultHandler test suite relies on.
      this.generatePdfStub = this.sandbox.stub(pdfGenerator, 'generatePdf');

      this.extractFrontMatterStub = this.sandbox.stub(markdownUtils, 'extractFrontMatter');
      this.removeShortcodesStub = this.sandbox.stub(markdownUtils, 'removeShortcodes');
      this.renderMarkdownToHtmlStub = this.sandbox.stub(markdownUtils, 'renderMarkdownToHtml');
      this.generateSlugStub = this.sandbox.stub(markdownUtils, 'generateSlug');
      this.ensureAndPreprocessHeadingStub = this.sandbox.stub(markdownUtils, 'ensureAndPreprocessHeading');
      this.substituteAllPlaceholdersStub = this.sandbox.stub(markdownUtils, 'substituteAllPlaceholders');

      const mathIntegrationInstance = createMathIntegration();
      this.getMathCssContentStub = this.sandbox.stub(mathIntegrationInstance, 'getMathCssContent');
      this.configureMarkdownItForMathStub = this.sandbox.stub(mathIntegrationInstance, 'configureMarkdownItForMath');
      // Hijack the require cache so any call to require('../src/core/math_integration') gets our stubbed instance's factory
      require.cache[require.resolve(mathIntegrationPath)] = {
        exports: () => mathIntegrationInstance
      };

      this.readFileStub = this.sandbox.stub(fs, 'readFile');
      this.mkdirStub = this.sandbox.stub(fs, 'mkdir');
      this.existsSyncStub = this.sandbox.stub(fss, 'existsSync');

      // Inject testLogger as '@paths'.logger before requiring DefaultHandler
      require.cache[require.resolve('@paths')] = {
        exports: {
          ...require('@paths'),
          logger: testLogger
        }
      };

      // Re-require DefaultHandler to ensure it picks up all stubbed dependencies
      delete require.cache[require.resolve(defaultHandlerPath)];
      const DefaultHandler = require(defaultHandlerPath);
      this.defaultHandler = new DefaultHandler();

      if (done) done();
    },

    afterEach(done) {
      // Restore the sandbox
      this.sandbox.restore();
      // Clean up the require cache to prevent test pollution
      delete require.cache[require.resolve(mathIntegrationPath)];
      delete require.cache[require.resolve(defaultHandlerPath)];
      // Clean up the logger injection
      delete require.cache[require.resolve('@paths')];
      if (done) done();
    }
  }
};
