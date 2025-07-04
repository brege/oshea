// test/integration/core/pdf-generator.test.2.3.4.js
const { pdfGeneratorPath } = require("@paths");

const { generatePdf } = require(pdfGeneratorPath);
const puppeteer = require('puppeteer');
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.4: Injecting CSS Content', function() {
    let mockBrowser;
    let mockPage;

    beforeEach(function() {
        this.sandbox = sinon.createSandbox();
        mockBrowser = {
            newPage: this.sandbox.stub().resolves(),
            close: this.sandbox.stub().resolves(),
        };
        mockPage = {
            setContent: this.sandbox.stub().resolves(),
            pdf: this.sandbox.stub().resolves(),
            close: this.sandbox.stub().resolves(),
        };
        mockBrowser.newPage.resolves(mockPage);
        this.sandbox.stub(puppeteer, 'launch').resolves(mockBrowser);
        this.sandbox.stub(console, 'error');
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should inject cssContent into the generated HTML page before rendering the PDF', async function() {
        const htmlBodyContent = '<p>Content to be styled.</p>';
        const outputPdfPath = '/tmp/css-injection.pdf';
        const pdfOptionsFromConfig = {};
        const cssFileContentsArray = [
            'body { font-family: Arial; }',
            'h1 { color: blue; }',
            '.highlight { background-color: yellow; }'
        ];
        const combinedCss = cssFileContentsArray.join('\n\n/* --- Next CSS File --- */\n\n');
        const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf');

        // Updated to match the exact template output (indentation, line breaks, and no extra whitespace)
        const expectedFullHtmlPage = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>${combinedCss}</style>
            
        </head>
        <body><p>Content to be styled.</p></body>
        </html>`;

        await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

        expect(puppeteer.launch.calledOnce).to.be.true;
        expect(mockBrowser.newPage.calledOnce).to.be.true;
        expect(mockPage.setContent.calledOnce).to.be.true;
        expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim());
        expect(mockPage.setContent.getCall(0).args[1]).to.deep.equal({ waitUntil: 'networkidle0' });
        expect(mockPage.pdf.calledOnce).to.be.true;
        expect(mockBrowser.close.calledOnce).to.be.true;
        expect(console.error.notCalled).to.be.true;
    });
});

