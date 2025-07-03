// test/integration/core/pdf-generator.test.2.3.6.js
const { pdfGeneratorPath } = require("@paths");

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require(pdfGeneratorPath);
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.6: Error Handling (Puppeteer Launch Failure)', function() {
    let mockBrowser;
    let mockPage;

    beforeEach(function() {
        // Create a sinon sandbox for this test file to ensure stubs are restored after each test
        this.sandbox = sinon.createSandbox();

        // Mock objects, though they won't be used if launch fails
        mockBrowser = {
            newPage: this.sandbox.stub().resolves(),
            close: this.sandbox.stub().resolves(),
        };
        mockPage = {
            setContent: this.sandbox.stub().resolves(),
            pdf: this.sandbox.stub().resolves(),
            close: this.sandbox.stub().resolves(),
        };

        // Stub console.error to catch log messages
        this.consoleErrorStub = this.sandbox.stub(console, 'error');
    });

    afterEach(function() {
        // Restore all stubs created in this sandbox
        this.sandbox.restore();
    });

    it('should throw an error and log it if Puppeteer fails to launch (e.g., executable not found)', async function() {
        const htmlBodyContent = '<p>Content</p>';
        const outputPdfPath = '/tmp/launch-fail.pdf';
        const pdfOptionsFromConfig = {};
        const cssFileContentsArray = [];

        // Crucial stub: Make puppeteer.launch reject, simulating a launch failure
        const launchError = new Error('Mock Puppeteer launch error: Executable not found');
        this.sandbox.stub(puppeteer, 'launch').rejects(launchError);

        let thrownError = null;
        try {
            // Call the method under test
            await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);
        } catch (e) {
            thrownError = e; // Catch the error re-thrown by generatePdf
        }

        // Assertions:
        // 1. Puppeteer.launch was attempted
        expect(puppeteer.launch.calledOnce).to.be.true;

        // 2. An error was thrown by generatePdf
        expect(thrownError).to.be.an('error');
        expect(thrownError.message).to.match(new RegExp(`^Error during PDF generation for ".*": .*`));

        // 3. The error was logged to console.error
        expect(this.consoleErrorStub.calledOnce).to.be.true;
        expect(this.consoleErrorStub.getCall(0).args[0]).to.match(new RegExp(`^Error during PDF generation for ".*": .*`));

        // 4. Subsequent Puppeteer methods were NOT called since launch failed
        expect(mockBrowser.newPage.notCalled).to.be.true;
        expect(mockPage.setContent.notCalled).to.be.true;
        expect(mockPage.pdf.notCalled).to.be.true;
        expect(mockBrowser.close.notCalled).to.be.true; // Browser wasn't launched, so no close call
    });
});
