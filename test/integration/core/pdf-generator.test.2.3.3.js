// test/integration/pdf-generator/pdf-generator.test.2.3.3.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.3: Applying Margin Options', function() {
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
            close: this.sandbox.stub().resolves(),
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

    it('should correctly apply margin options (top, bottom, left, right) from pdfOptions', async function() {
        const htmlBodyContent = '<p>Content with custom margins.</p>';
        const outputPdfPath = '/tmp/margin-output.pdf';
        const cssFileContentsArray = [];

        // Define specific pdfOptions with explicit margin values
        const pdfOptionsFromConfig = {
            margin: {
                top: '2cm',
                right: '1.5cm',
                bottom: '2.5cm',
                left: '1cm'
            }
            // Note: format and printBackground are not specified, so defaults from pdf_generator.js should apply
        };

        // Expected Puppeteer PDF options (after generatePdf applies its defaults for format/printBackground)
        const expectedPuppeteerPdfOptions = {
            path: outputPdfPath,
            format: 'A4',             // Default applied by generatePdf
            printBackground: true,    // Default applied by generatePdf
            margin: {                 // From pdfOptionsFromConfig (should be used directly)
                top: '2cm',
                right: '1.5cm',
                bottom: '2.5cm',
                left: '1cm'
            }
        };

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions:
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;

        // Crucial assertion: Verify page.pdf was called with the correctly merged options, including margins
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);

        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});
