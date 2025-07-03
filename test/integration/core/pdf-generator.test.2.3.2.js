// test/integration/core/pdf-generator.test.2.3.2.js
const { pdfGeneratorPath } = require("@paths");

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require(pdfGeneratorPath);
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.2: Applying PDF Options (format, printBackground, scale)', function() {
    let mockBrowser;
    let mockPage;

    beforeEach(function() {
        // Create a sinon sandbox for this test file to ensure stubs are restored after each test
        this.sandbox = sinon.createSandbox();

        // 1. Mock the Puppeteer browser object
        mockBrowser = {
            newPage: this.sandbox.stub().resolves(), // Will be populated with mockPage below
            close: this.sandbox.stub().resolves(),
        };

        // 2. Mock the Puppeteer page object
        mockPage = {
            setContent: this.sandbox.stub().resolves(),
            pdf: this.sandbox.stub().resolves(),
            close: this.sandbox.stub().resolves(), // Not explicitly called in generatePdf, but good practice
        };

        // Connect mockPage to mockBrowser.newPage
        mockBrowser.newPage.resolves(mockPage);

        // 3. Stub puppeteer.launch to return our mock browser
        this.sandbox.stub(puppeteer, 'launch').resolves(mockBrowser);

        // 4. Stub console.error to prevent actual logging during tests
        this.sandbox.stub(console, 'error');
    });

    afterEach(function() {
        // Restore all stubs created in this sandbox
        this.sandbox.restore();
    });

    it('should correctly apply various pdfOptions such as format, printBackground, and scale', async function() {
        const htmlBodyContent = '<h1>Test Content</h1>';
        const outputPdfPath = '/tmp/options-output.pdf';
        const cssFileContentsArray = ['body { font-size: 12pt; }'];

        // Define the specific pdfOptions to be tested
        const pdfOptionsFromConfig = {
            format: 'Letter',
            printBackground: false,
            scale: 0.8,
            // Note: margin is not specified here, so the default from pdf_generator.js should apply
        };

        // Expected Puppeteer PDF options (after generatePdf applies its defaults)
        const expectedPuppeteerPdfOptions = {
            path: outputPdfPath,
            format: 'Letter',         // From pdfOptionsFromConfig
            printBackground: false,   // From pdfOptionsFromConfig
            scale: 0.8,               // From pdfOptionsFromConfig
            margin: {                 // Default applied by generatePdf
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions:
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;

        // Crucial assertion: Verify page.pdf was called with the correctly merged options
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);

        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});
