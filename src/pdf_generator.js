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

        // Use the PDF filename (without extension) as the default HTML document title.
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

        // For debugging: uncomment to save the HTML sent to Puppeteer.
        // const debugHtmlPath = outputPdfPath.replace(/\.pdf$/, '_debug_page.html');
        // fs.writeFileSync(debugHtmlPath, fullHtmlPage, 'utf8');
        // console.log(`DEBUG: Full HTML page for PDF generation saved to: ${debugHtmlPath}`);

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--font-render-hinting=none', // Can improve font rendering consistency across platforms. 
                // '--disable-dev-shm-usage', // Often useful in constrained CI/Docker environments. 
            ],
            // headless: "new", // Uncomment for the new headless mode if issues arise with the default. 
        });

        const page = await browser.newPage();

        await page.setContent(fullHtmlPage, {
            waitUntil: 'networkidle0', // Waits until network connections are idle. 
        });

        // Start with all options from the resolved configuration
        const puppeteerPdfOptions = { ...pdfOptionsFromConfig };

        // Explicitly set the output path
        puppeteerPdfOptions.path = outputPdfPath;

        // Apply defaults for core Puppeteer options if they were not present in pdfOptionsFromConfig
        if (puppeteerPdfOptions.format === undefined) {
            puppeteerPdfOptions.format = 'A4'; // Default format
        }
        if (puppeteerPdfOptions.printBackground === undefined) {
            puppeteerPdfOptions.printBackground = true; // Default printBackground
        }
        if (puppeteerPdfOptions.margin === undefined) {
            puppeteerPdfOptions.margin = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }; // Default margins
        }
        // Other options like 'landscape', 'width', 'height', 'scale', etc.,
        // if present in pdfOptionsFromConfig, will be passed through due to the spread operator.

        await page.pdf(puppeteerPdfOptions);

    } catch (error) {
        // Augment error with context for better diagnostics.
        const errorMessage = `Error during PDF generation for "${outputPdfPath}": ${error.message}`;
        console.error(errorMessage, error.stack); // Log stack for easier debugging.
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
