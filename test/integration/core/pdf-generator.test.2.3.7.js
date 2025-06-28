// test/integration/core/pdf-generator.test.2.3.7.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../../src/core/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.7: Error Handling (setContent Failure)', function() {
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
            setContent: this.sandbox.stub().resolves(), // This will be overriden to reject for the test
            pdf: this.sandbox.stub().resolves(),
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

    it('should throw an error and log it if setting page content fails', async function() {
        const htmlBodyContent = '<html><body>Invalid HTML</body></html>';
        const outputPdfPath = '/tmp/set-content-fail.pdf';
        const pdfOptionsFromConfig = {};
        const cssFileContentsArray = [];

        // Crucial stub: Make page.setContent reject, simulating a content setting failure
        const setContentError = new Error('Mock page.setContent error: Invalid content');
        mockPage.setContent.rejects(setContentError);

        let thrownError = null;
        try {
            // Call the method under test
            await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);
        } catch (e) {
            thrownError = e; // Catch the error re-thrown by generatePdf
        }

        // Assertions:
        // 1. Puppeteer.launch was successful
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;

        // 2. page.setContent was attempted and failed
        expect(mockPage.setContent.calledOnce).to.be.true;
        expect(mockPage.setContent.getCall(0).args[0]).to.include(htmlBodyContent); // Ensure it was called with the HTML

        // 3. An error was thrown by generatePdf
        expect(thrownError).to.be.an('error');
        expect(thrownError.message).to.include(`Error during PDF generation for "${outputPdfPath}": ${setContentError.message}`);

        // 4. The error was logged to console.error
        expect(this.consoleErrorStub.calledOnce).to.be.true;
        expect(this.consoleErrorStub.getCall(0).args[0]).to.include(`Error during PDF generation for "${outputPdfPath}": ${setContentError.message}`);

        // 5. page.pdf was NOT called since an earlier step failed
        expect(mockPage.pdf.notCalled).to.be.true;

        // 6. Browser was closed in the finally block
        expect(mockBrowser.close.calledOnce).to.be.true;
    });
});
