// src/core/pdf_generator.js
const puppeteer = require('puppeteer');
const path = require('path');

async function generatePdf(htmlBodyContent, outputPdfPath, pdfOptions, cssFileContentsArray, htmlTemplateStr = null, injectionPoints = {}) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const combinedCss = (cssFileContentsArray || []).join('\n\n/* --- Next CSS File --- */\n\n');

    const { head_html = '', body_html_start = '', body_html_end = '', lang = 'en' } = injectionPoints;

    let template = htmlTemplateStr;
    if (!template || typeof template !== 'string') {
      template = `<!DOCTYPE html>
        <html lang="${lang}">
        <head>
            <meta charset="utf-8">
            <title>{{{title}}}</title>
            <style>{{{styles}}}</style>
            ${head_html}
        </head>
        <body>${body_html_start}{{{body}}}${body_html_end}</body>
        </html>`;
    }

    const documentTitle = (pdfOptions && pdfOptions.title) ? pdfOptions.title : path.basename(outputPdfPath, '.pdf');

    const finalHtml = template
      .replace('{{{title}}}', documentTitle)
      .replace('{{{styles}}}', combinedCss)
      .replace('{{{body}}}', htmlBodyContent === null ? 'null' : (htmlBodyContent || ''));

    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

    const defaultPdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    };

    if (pdfOptions && (pdfOptions.width || pdfOptions.height)) {
      delete defaultPdfOptions.format;
    }

    const finalPdfOptions = {
      ...defaultPdfOptions,
      ...(pdfOptions || {}),
      margin: {
        ...defaultPdfOptions.margin,
        ...((pdfOptions || {}).margin || {})
      },
      path: outputPdfPath
    };

    await page.pdf(finalPdfOptions);

  } catch (error) {
    const descriptiveError = new Error(`Error during PDF generation for "${outputPdfPath}": ${error.message}`);
    descriptiveError.stack = error.stack;
    console.error(descriptiveError.message);
    throw descriptiveError;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generatePdf };
