// test/pdf-generator/pdf-generator.test.2.3.4.js

// Require the actual pdf_generator module for testing its internal logic
const { generatePdf } = require('../../src/pdf_generator');
// Require puppeteer to stub its methods
const puppeteer = require('puppeteer');
// Access global test utilities from setup.js
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.4: Injecting CSS Content', function() {
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

    it('should inject cssContent into the generated HTML page before rendering the PDF', async function() {
        const htmlBodyContent = '<p>Content to be styled.</p>';
        const outputPdfPath = '/tmp/css-injection.pdf';
        const pdfOptionsFromConfig = {}; // Basic empty options

        // Define the CSS content to be injected (as an array, mimicking DefaultHandler output)
        const cssFileContentsArray = [
            'body { font-family: Arial; }',
            'h1 { color: blue; }',
            '.highlight { background-color: yellow; }'
        ];

        // The pdf_generator.js module joins these with a specific separator
        const combinedCss = cssFileContentsArray.join('\n\n/* --- Next CSS File --- */\n\n');

        // Construct the full HTML page that pdf_generator is expected to build internally
        const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf'); // 'css-injection'
        const expectedFullHtmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>
                ${combinedCss}
            </style>
        </head>
        <body>
            ${htmlBodyContent}
        </body>
        </html>`;

        // Call the method under test
        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        // Assertions:
        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;

        // Crucial assertion: Verify page.setContent was called with HTML containing the injected CSS
        expect(mockPage.setContent.calledOnce).to.be.true;
        // Trim to account for potential whitespace differences in template literals
        expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim());
        expect(mockPage.setContent.getCall(0).args[1]).to.deep.equal({ waitUntil: 'networkidle0' });

        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});
