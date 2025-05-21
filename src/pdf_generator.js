// src/pdf_generator.js

/**
 * @fileoverview Module responsible for generating PDF documents from HTML content
 * using Puppeteer. It handles HTML page construction, CSS injection,
 * and Puppeteer's PDF rendering process.
 */

const puppeteer = require('puppeteer');
const path = require('path'); // Used for deriving a default document title from the output filename.
// const fs = require('fs'); // Only needed if actively using the debug HTML dump 

/**
 * Generates a PDF from a given HTML string, applying CSS and PDF options via Puppeteer.
 *
 * @async
 * @param {string} htmlBodyContent - The HTML content for the body of the document.
 * This module will wrap it in a full HTML structure.
 * @param {string} outputPdfPath - The absolute path where the PDF will be saved.
 * @param {Object} pdfOptionsFromConfig - Puppeteer's PDF options (e.g., format, margin, printBackground, landscape)
 * from the resolved configuration. Refer to Puppeteer documentation for all available options.
 * @param {Array<string>} cssFileContentsArray - An array where each element is the string content of a CSS file.
 * @returns {Promise<void>} A promise that resolves when the PDF has been generated.
 * @throws {Error} If PDF generation fails at any stage (Puppeteer launch, page setup, or PDF writing).
 */
async function generatePdf(htmlBodyContent, outputPdfPath, pdfOptionsFromConfig, cssFileContentsArray) {
    let browser;
    try {
        const combinedCss = cssFileContentsArray.join('\n\n/* --- Next CSS File --- */\n\n');

        const documentTitle = path.basename(outputPdfPath, '.pdf');

        const fullHtmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${documentTitle}</title>
            <style>
                ${combinedCss}
            </style>
        </head>
        <body>
            ${htmlBodyContent}
        </body>
        </html>`;

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--font-render-hinting=none',
            ],
        });

        const page = await browser.newPage();

        await page.setContent(fullHtmlPage, {
            waitUntil: 'networkidle0', 
        });

        const puppeteerPdfOptions = { ...pdfOptionsFromConfig };
        puppeteerPdfOptions.path = outputPdfPath;

        // If specific width or height are provided by the plugin, ensure 'format' is removed
        // to prioritize explicit dimensions over a standard page format.
        if (puppeteerPdfOptions.width || puppeteerPdfOptions.height) {
            delete puppeteerPdfOptions.format;
        }

        // Apply defaults for core Puppeteer options if they were not present
        if (!puppeteerPdfOptions.width && !puppeteerPdfOptions.height && puppeteerPdfOptions.format === undefined) {
            puppeteerPdfOptions.format = 'A4'; 
        }
        if (puppeteerPdfOptions.printBackground === undefined) {
            puppeteerPdfOptions.printBackground = true; 
        }
        if (puppeteerPdfOptions.margin === undefined) {
            puppeteerPdfOptions.margin = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' };
        }
        
        await page.pdf(puppeteerPdfOptions);

    } catch (error) {
        const errorMessage = `Error during PDF generation for "${outputPdfPath}": ${error.message}`;
        console.error(errorMessage, error.stack);
        throw new Error(errorMessage);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    generatePdf,
};
