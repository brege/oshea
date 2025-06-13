// test/integration/pdf-generator/pdf-generator.test.2.3.10.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.10: Handling Empty Content', function() {
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

    it('should correctly handle empty htmlContent and empty cssContent without crashing', async function() {
        // Test with empty string for htmlBodyContent and empty array for cssFileContentsArray
        const htmlBodyContent = ''; 
        const outputPdfPath = '/tmp/empty-content.pdf';
        const pdfOptionsFromConfig = {}; 
        const cssFileContentsArray = []; // Empty CSS array

        // Construct the expected full HTML page that pdf_generator is expected to build internally
        const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf'); // 'empty-content'
        const expectedFullHtmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>
                
            </style>
        </head>
        <body>
            
        </body>
        </html>`;

        // Define expected Puppeteer PDF options (after generatePdf applies its defaults)
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
        // Ensure that Puppeteer methods were called as expected, indicating no crash
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;
        
        // Crucial assertion: Verify page.setContent was called with the correctly formed HTML
        expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim());
        expect(mockPage.setContent.getCall(0).args[1]).to.deep.equal({ waitUntil: 'networkidle0' });

        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);

        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true; // Ensure no errors were logged
    });

    it('should correctly handle null htmlContent without crashing', async function() {
        // Test with null for htmlBodyContent
        const htmlBodyContent = null; 
        const outputPdfPath = '/tmp/null-html-content.pdf';
        const pdfOptionsFromConfig = {}; 
        const cssFileContentsArray = []; // Empty CSS array

        // Expected full HTML page when htmlBodyContent is null (it will be embedded as "null")
        const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf'); // 'null-html-content'
        const expectedFullHtmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>
                
            </style>
        </head>
        <body>
            null
        </body>
        </html>`;

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions (similar to empty content case, just checking specific HTML content)
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;
        expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim());
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});
