// test/setup.js
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');

// Require core Node.js modules and utility modules that don't need special caching handling
const fs = require('fs').promises;
const fss = require('fs'); // Sync operations (and now for fs.constants.F_OK)

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

            // Clear cache and stub dependencies BEFORE the main module (DefaultHandler) that uses them.

            // 1. Clear cache and stub pdf_generator
            delete require.cache[require.resolve('../src/pdf_generator')];
            const pdf_generator = require('../src/pdf_generator'); // Re-require to get a fresh module object
            this.generatePdfStub = this.sandbox.stub(pdf_generator, 'generatePdf');

            // 2. Clear cache and stub markdown_utils
            delete require.cache[require.resolve('../src/markdown_utils')];
            const markdown_utils = require('../src/markdown_utils'); // Re-require for fresh module object
            this.extractFrontMatterStub = this.sandbox.stub(markdown_utils, 'extractFrontMatter');
            this.removeShortcodesStub = this.sandbox.stub(markdown_utils, 'removeShortcodes');
            this.renderMarkdownToHtmlStub = this.sandbox.stub(markdown_utils, 'renderMarkdownToHtml');
            this.generateSlugStub = this.sandbox.stub(markdown_utils, 'generateSlug');
            this.ensureAndPreprocessHeadingStub = this.sandbox.stub(markdown_utils, 'ensureAndPreprocessHeading');
            this.substituteAllPlaceholdersStub = this.sandbox.stub(markdown_utils, 'substituteAllPlaceholders');

            // 3. Clear cache and re-require math_integration as a factory function, then call it
            delete require.cache[require.resolve('../src/math_integration')];
            const createMathIntegration = require('../src/math_integration'); 
            // This is now the factory function
            
            // Call the factory function to get the object with the methods for stubbing.
            // - For setup.js, we let it use its default (real) dependencies since it's not 
            //   proxyquired like the specific math_integration tests.
            const math_integration_instance = createMathIntegration(); 
            this.getMathCssContentStub = this.sandbox.stub(math_integration_instance, 'getMathCssContent');
            this.configureMarkdownItForMathStub = this.sandbox.stub(math_integration_instance, 'configureMarkdownItForMath'); // Also stub configureMarkdownItForMath for consistency if it gets called globally.

            // 4. Stub fs and fss methods (Node.js built-ins, usually don't need cache clearing)
            this.readFileStub = this.sandbox.stub(fs, 'readFile');
            this.mkdirStub = this.sandbox.stub(fs, 'mkdir');
            this.existsSyncStub = this.sandbox.stub(fss, 'existsSync');

            // 5. Finally, clear cache and re-require DefaultHandler.
            // This ensures DefaultHandler imports the *stubbed* versions of its dependencies.
            delete require.cache[require.resolve('../src/default_handler')];
            const DefaultHandler = require('../src/default_handler');
            this.defaultHandler = new DefaultHandler();

            
            if (done) done();
        },

        afterEach(done) {
            // Restore all stubs created in the sandbox
            this.sandbox.restore();
            if (done) done();
        }
    }
};
