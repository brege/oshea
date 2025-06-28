// test/integration/pdf-generator/pdf-generator.test.2.3.1.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.1: Basic PDF Generation Success', function() {
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

    it('should successfully launch Puppeteer, generate a PDF, and close the browser', async function() {
        const htmlBodyContent = '<h1>Test Document</h1><p>This is the content.</p>';
        const outputPdfPath = '/tmp/test-output.pdf';
        const pdfOptionsFromConfig = {}; // Minimal options
        const cssFileContentsArray = ['/* body { color: black; } */'];

        // Construct the full HTML page that pdf_generator is expected to build internally
        const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf');
        const expectedFullHtmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>
                /* body { color: black; } */
            </style>
        </head>
        <body>
            <h1>Test Document</h1><p>This is the content.</p>
        </body>
        </html>`;

        // Define expected Puppeteer PDF options (after defaults are applied by generatePdf)
        const expectedPuppeteerPdfOptions = {
            path: outputPdfPath,
            format: 'A4',         // Default applied by generatePdf
            printBackground: true, // Default applied by generatePdf
            margin: {             // Default applied by generatePdf
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions:
        // 1. Puppeteer was launched
        expect(puppeteer.launch.calledOnce).to.be.true;

        // 2. A new page was created
        expect(mockBrowser.newPage.calledOnce).to.be.true;

        // 3. Page content was set with the correctly constructed full HTML
        expect(mockPage.setContent.calledOnce).to.be.true;
        expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim()); // Trim for whitespace comparison
        expect(mockPage.setContent.getCall(0).args[1]).to.deep.equal({ waitUntil: 'networkidle0' });

        // 4. PDF was generated with the correct options
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);

        // 5. Browser was closed
        expect(mockBrowser.close.calledOnce).to.be.true;

        // Ensure no errors were logged to console.error
        expect(console.error.notCalled).to.be.true;
    });
});
