// src/core/pdf-generator.js
const puppeteer = require('puppeteer');
const path = require('path');

const { loggerPath } = require('@paths');
const logger = require(loggerPath);

async function generatePdf(htmlBodyContent, outputPdfPath, pdfOptions, cssFileContentsArray, htmlTemplateStr = null, injectionPoints = {}) {
  let browser = null;
  let page = null;
  try {
    logger.debug('Launching Puppeteer browser', {
      context: 'PDFGenerator'
    });
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    logger.debug('New Puppeteer page created', {
      context: 'PDFGenerator'
    });

    const combinedCss = (cssFileContentsArray || []).join('\n\n/* --- Next CSS File --- */\n\n');
    logger.debug('Combined CSS content', {
      context: 'PDFGenerator',
      cssFileCount: (cssFileContentsArray || []).length,
      combinedCssLength: combinedCss.length
    });

    const { headHtml = '', bodyHtmlStart = '', bodyHtmlEnd = '', lang = 'en' } = injectionPoints;
    logger.debug('Injection points resolved', {
      context: 'PDFGenerator',
      lang: lang
    });

    let template = htmlTemplateStr;
    if (!template || typeof template !== 'string') {
      template = `<!DOCTYPE html>
        <html lang="${lang}">
        <head>
          <meta charset="utf-8">
          <title>{{{title}}}</title>
          <style>{{{styles}}}</style>
          ${headHtml}
        </head>
        <body>${bodyHtmlStart}{{{body}}}${bodyHtmlEnd}</body>
        </html>`;
      logger.debug('Using default HTML template', {
        context: 'PDFGenerator'
      });
    } else {
      logger.debug('Using custom HTML template', {
        context: 'PDFGenerator',
        templateLength: template.length
      });
    }

    const documentTitle = (pdfOptions && pdfOptions.title) ? pdfOptions.title : path.basename(outputPdfPath, '.pdf');
    logger.debug('Resolved document title for PDF', {
      context: 'PDFGenerator',
      title: documentTitle,
      outputPath: outputPdfPath
    });

    const finalHtml = template
      .replace('{{{title}}}', documentTitle)
      .replace('{{{styles}}}', combinedCss)
      .replace('{{{body}}}', htmlBodyContent === null ? 'null' : (htmlBodyContent || ''));
    logger.debug('Final HTML content prepared', {
      context: 'PDFGenerator',
      finalHtmlLength: finalHtml.length
    });

    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    logger.debug('Page content set', {
      context: 'PDFGenerator'
    });

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
      logger.debug('PDF format removed due to custom width/height', {
        context: 'PDFGenerator',
        width: pdfOptions.width,
        height: pdfOptions.height
      });
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
    logger.debug('Final PDF options assembled', {
      context: 'PDFGenerator',
      options: finalPdfOptions
    });

    await page.pdf(finalPdfOptions);
    logger.debug('PDF successfully generated', {
      context: 'PDFGenerator',
      outputPath: outputPdfPath
    });

  } catch (error) {
    const descriptiveError = new Error(`Error during PDF generation for "${outputPdfPath}": ${error.message}`);
    descriptiveError.stack = error.stack;
    logger.error('Error during PDF generation', {
      context: 'PDFGenerator',
      outputPath: outputPdfPath,
      error: descriptiveError.message,
      stack: descriptiveError.stack
    });
    throw descriptiveError;
  } finally {
    if (page) {
      try {
        await page.close();
        logger.debug('Puppeteer page closed', {
          context: 'PDFGenerator'
        });
      } catch (e) {
        logger.warn('Failed to close Puppeteer page', {
          context: 'PDFGenerator',
          error: e.message
        });
      }
    }
    if (browser) {
      try {
        await browser.close();
        logger.debug('Puppeteer browser closed', {
          context: 'PDFGenerator'
        });
      } catch (e) {
        logger.warn('Failed to close Puppeteer browser', {
          context: 'PDFGenerator',
          error: e.message
        });
      }
    }
  }
}

module.exports = { generatePdf };
