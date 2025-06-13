// test/integration/pdf-generator/pdf-generator.test.2.3.5.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.5: Handling Header/Footer Templates', function() {
    let mockBrowser;
    let mockPage;

    beforeEach(function() {
        // Create a sinon sandbox for this test file to ensure stubs are restored after each test
        this.sandbox = sinon.createSandbox();

        // 1. Mock the Puppeteer browser object
        mockBrowser = {
            newPage: this.sandbox.stub().resolves(),
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

    it('should correctly handle header and footer templates, including dynamic fields, when provided in pdfOptions', async function() {
        const htmlBodyContent = '<p>Document content.</p>';
        const outputPdfPath = '/tmp/header-footer.pdf';
        const cssFileContentsArray = [];

        // Define pdfOptions with header/footer templates and dynamic fields
        const pdfOptionsFromConfig = {
            displayHeaderFooter: true,
            headerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">My Document Header - Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
            footerTemplate: '<div style="font-size:8px; text-align:right; width:100%;">Generated on <span class="date"></span></div>',
            // Other options will default
        };

        // Expected Puppeteer PDF options (after generatePdf applies its defaults for format/printBackground/margin)
        const expectedPuppeteerPdfOptions = {
            path: outputPdfPath,
            format: 'A4',             // Default applied by generatePdf
            printBackground: true,    // Default applied by generatePdf
            margin: {                 // Default applied by generatePdf
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            displayHeaderFooter: true,
            headerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">My Document Header - Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
            footerTemplate: '<div style="font-size:8px; text-align:right; width:100%;">Generated on <span class="date"></span></div>',
        };

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions:
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;

        // Crucial assertion: Verify page.pdf was called with the correctly merged options, including header/footer
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);

        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});
