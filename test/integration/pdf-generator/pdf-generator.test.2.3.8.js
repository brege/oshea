// test/integration/pdf-generator/pdf-generator.test.2.3.8.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.8: Error Handling (PDF Generation Failure)', function() {
    let mockBrowser;
    let mockPage;

    beforeEach(function() {
        // Create a sinon sandbox for this test file to ensure stubs are restored after each test
        this.sandbox = sinon.createSandbox();

        // 1. Mock the Puppeteer browser object
        mockBrowser = {
            newPage: this.sandbox.stub().resolves(), // Will resolve to mockPage
            close: this.sandbox.stub().resolves(),
        };

        // 2. Mock the Puppeteer page object
        mockPage = {
            setContent: this.sandbox.stub().resolves(), // This will resolve, as content setting succeeds
            pdf: this.sandbox.stub().resolves(),        // This will be overriden to reject for the test
            close: this.sandbox.stub().resolves(),
        };

        // Connect mockPage to mockBrowser.newPage
        mockBrowser.newPage.resolves(mockPage);

        // 3. Stub puppeteer.launch to return our mock browser (successful launch)
        this.sandbox.stub(puppeteer, 'launch').resolves(mockBrowser);

        // 4. Stub console.error to catch log messages
        this.consoleErrorStub = this.sandbox.stub(console, 'error');
    });

    afterEach(function() {
        // Restore all stubs created in this sandbox
        this.sandbox.restore();
    });

    it('should throw an error and log it if PDF generation itself fails (e.g., invalid pdfOptions)', async function() {
        const htmlBodyContent = '<p>Content for PDF.</p>';
        const outputPdfPath = '/tmp/pdf-fail.pdf';
        // Provide some pdfOptions, potentially invalid to trigger failure (Puppeteer's pdf method would reject)
        const pdfOptionsFromConfig = {
            format: 'Custom', // An invalid format might cause Puppeteer's pdf method to reject
            width: 'invalid-width-string' // Another example of potentially invalid option
        };

        // Crucial stub: Make page.pdf reject, simulating a PDF generation failure
        const pdfGenerationError = new Error('Mock PDF generation error: Invalid options or internal failure');
        mockPage.pdf.rejects(pdfGenerationError);

        let thrownError = null;
        try {
            // Call the method under test
            await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, []); // Pass empty css for simplicity
        } catch (e) {
            thrownError = e; // Catch the error re-thrown by generatePdf
        }

        // Assertions:
        // 1. Puppeteer.launch and newPage were successful
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true; // setContent should have succeeded

        // 2. page.pdf was attempted and failed
        expect(mockPage.pdf.calledOnce).to.be.true; // It was called before it rejected
        expect(mockPage.pdf.getCall(0).args[0].path).to.equal(outputPdfPath); // Check path is part of options

        // 3. An error was thrown by generatePdf
        expect(thrownError).to.be.an('error');
        expect(thrownError.message).to.include(`Error during PDF generation for "${outputPdfPath}": ${pdfGenerationError.message}`);

        // 4. The error was logged to console.error
        expect(this.consoleErrorStub.calledOnce).to.be.true;
        expect(this.consoleErrorStub.getCall(0).args[0]).to.include(`Error during PDF generation for "${outputPdfPath}": ${pdfGenerationError.message}`);

        // 5. Browser was closed in the finally block
        expect(mockBrowser.close.calledOnce).to.be.true;
    });
});
