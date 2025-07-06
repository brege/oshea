// test/integration/core/pdf-generator.test.2.3.1.js
const { pdfGeneratorPath } = require('@paths');

const { generatePdf } = require(pdfGeneratorPath);
const puppeteer = require('puppeteer');
const { expect, sinon, path } = global;

describe('pdf_generator (L2Y3) - Scenario 2.3.1: Basic PDF Generation Success', function() {
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

  it('should successfully launch Puppeteer, generate a PDF, and close the browser', async function() {
    const htmlBodyContent = '<h1>Test Document</h1><p>This is the content.</p>';
    const outputPdfPath = '/tmp/test-output.pdf';
    const pdfOptionsFromConfig = {};
    const cssFileContentsArray = ['/* body { color: black; } */'];
    const expectedDocumentTitle = path.basename(outputPdfPath, '.pdf');

    const expectedFullHtmlPage = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${expectedDocumentTitle}</title>
            <style>/* body { color: black; } */</style>
            
        </head>
        <body><h1>Test Document</h1><p>This is the content.</p></body>
        </html>`;

    const expectedPuppeteerPdfOptions = {
      path: outputPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    };

    await generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray);

    expect(puppeteer.launch.calledOnce).to.be.true;
    expect(mockBrowser.newPage.calledOnce).to.be.true;
    expect(mockPage.setContent.calledOnce).to.be.true;
    expect(mockPage.setContent.getCall(0).args[0].trim()).to.equal(expectedFullHtmlPage.trim());
    expect(mockPage.setContent.getCall(0).args[1]).to.deep.equal({ waitUntil: 'networkidle0' });
    expect(mockPage.pdf.calledOnce).to.be.true;
    expect(mockPage.pdf.getCall(0).args[0]).to.deep.equal(expectedPuppeteerPdfOptions);
    expect(mockBrowser.close.calledOnce).to.be.true;
    expect(console.error.notCalled).to.be.true;
  });
});
