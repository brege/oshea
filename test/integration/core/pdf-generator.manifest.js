// test/integration/core/pdf-generator.manifest.js
require('module-alias/register');
const { pdfGeneratorFactoryPath } = require('@paths');
const { makePdfGeneratorScenario } = require(pdfGeneratorFactoryPath);
const { JSDOM } = require('jsdom');

module.exports = [
  makePdfGeneratorScenario({
    description: '2.3.1: should successfully launch Puppeteer and generate a basic PDF',
    assertion: (result, { mockPuppeteer, mockPage }, { outputPdfPath, cssFileContentsArray, htmlBodyContent }, expect) => {
      expect(mockPuppeteer.launch.calledOnce).to.be.true;
      expect(mockPuppeteer.mockBrowser.newPage.calledOnce).to.be.true;
      expect(mockPage.setContent.calledOnce).to.be.true;
      expect(mockPage.pdf.calledOnce).to.be.true;
      expect(mockPuppeteer.mockBrowser.close.calledOnce).to.be.true;

      const actualHtml = mockPage.setContent.getCall(0).args[0];
      const dom = new JSDOM(actualHtml);
      expect(dom.window.document.body.innerHTML.trim()).to.equal(htmlBodyContent);
      expect(dom.window.document.querySelector('style').textContent).to.equal(cssFileContentsArray[0]);
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.2: should correctly apply format, printBackground, and scale options',
    assertion: (result, { mockPage }, { pdfOptionsFromConfig, outputPdfPath }, expect) => {
      const calledPdfOptions = mockPage.pdf.getCall(0).args[0];
      expect(calledPdfOptions.format).to.equal(pdfOptionsFromConfig.format);
      expect(calledPdfOptions.printBackground).to.equal(pdfOptionsFromConfig.printBackground);
      expect(calledPdfOptions.scale).to.equal(pdfOptionsFromConfig.scale);
      expect(calledPdfOptions.path).to.equal(outputPdfPath);
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.3: should correctly apply margin options',
    assertion: (result, { mockPage }, { pdfOptionsFromConfig }, expect) => {
      const calledPdfOptions = mockPage.pdf.getCall(0).args[0];
      expect(calledPdfOptions.margin).to.deep.equal(pdfOptionsFromConfig.margin);
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.4: should inject CSS content into the generated HTML',
    assertion: (result, { mockPage }, { cssFileContentsArray }, expect) => {
      const actualHtml = mockPage.setContent.getCall(0).args[0];
      const dom = new JSDOM(actualHtml);
      const combinedCss = cssFileContentsArray.join('\n\n/* --- Next CSS File --- */\n\n');
      expect(dom.window.document.querySelector('style').textContent).to.equal(combinedCss);
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.5: should handle header and footer templates',
    assertion: (result, { mockPage }, { pdfOptionsFromConfig }, expect) => {
      const calledPdfOptions = mockPage.pdf.getCall(0).args[0];
      expect(calledPdfOptions.displayHeaderFooter).to.be.true;
      expect(calledPdfOptions.headerTemplate).to.equal(pdfOptionsFromConfig.headerTemplate);
      expect(calledPdfOptions.footerTemplate).to.equal(pdfOptionsFromConfig.footerTemplate);
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.6: should throw an error if Puppeteer fails to launch',
    stubs: { launchRejects: 'Mock Puppeteer launch error' },
    assertion: (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('error');
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog, 'Expected an error log for Puppeteer launch failure').to.not.be.undefined;
      expect(errorLog.msg).to.equal('Error during PDF generation');
      expect(errorLog.data.context).to.equal('PDFGenerator');
      expect(errorLog.data.error).to.include('Mock Puppeteer launch error');
      expect(result.message).to.include('Mock Puppeteer launch error');
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.7: should throw an error if setting page content fails',
    stubs: { setContentRejects: 'Mock page.setContent error' },
    assertion: (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('error');
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog, 'Expected an error log for setContent failure').to.not.be.undefined;
      expect(errorLog.msg).to.equal('Error during PDF generation');
      expect(errorLog.data.context).to.equal('PDFGenerator');
      expect(errorLog.data.error).to.include('Mock page.setContent error');
      expect(result.message).to.include('Mock page.setContent error');
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.8: should throw an error if PDF generation fails',
    stubs: { pdfRejects: 'Mock PDF generation error' },
    assertion: (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('error');
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog, 'Expected an error log for PDF generation failure').to.not.be.undefined;
      expect(errorLog.msg).to.equal('Error during PDF generation');
      expect(errorLog.data.context).to.equal('PDFGenerator');
      expect(errorLog.data.error).to.include('Mock PDF generation error');
      expect(result.message).to.include('Mock PDF generation error');
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.10a: should handle empty htmlContent without crashing',
    assertion: (result, { mockPage }, { htmlBodyContent }, expect) => {
      const actualHtml = mockPage.setContent.getCall(0).args[0];
      const dom = new JSDOM(actualHtml);
      expect(dom.window.document.body.innerHTML.trim()).to.equal('');
    },
    constants: {
      htmlBodyContent: '',
      outputPdfPath: '/tmp/empty-content.pdf',
      pdfOptionsFromConfig: {},
      cssFileContentsArray: [],
    }
  }),
  makePdfGeneratorScenario({
    description: '2.3.10b: should handle null htmlContent without crashing',
    assertion: (result, { mockPage }, { htmlBodyContent }, expect) => {
      const actualHtml = mockPage.setContent.getCall(0).args[0];
      const dom = new JSDOM(actualHtml);
      expect(dom.window.document.body.innerHTML.trim()).to.equal('null');
    },
    constants: {
      htmlBodyContent: null,
      outputPdfPath: '/tmp/null-html-content.pdf',
      pdfOptionsFromConfig: {},
      cssFileContentsArray: [],
    }
  }),

  makePdfGeneratorScenario({
    description: '2.3.9a: should close browser and page after successful PDF generation',
    assertion: (result, { mockPuppeteer }, constants, expect) => {
      expect(mockPuppeteer.mockPage.close.called).to.be.true;
      expect(mockPuppeteer.mockBrowser.close.called).to.be.true;
    },
  }),

  makePdfGeneratorScenario({
    description: '2.3.9b: should close browser and page even if an error occurs during PDF generation',
    stubs: { pdfRejects: 'Simulated PDF error' },
    assertion: (result, { mockPuppeteer }, constants, expect) => {
      expect(result).to.be.an('error');
      expect(mockPuppeteer.mockPage.close.called).to.be.true;
      expect(mockPuppeteer.mockBrowser.close.called).to.be.true;
    },
  }),

];
