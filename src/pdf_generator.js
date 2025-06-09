// src/pdf_generator.js
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
        
        const styles = `<style>${cssFileContentsArray.join('\n')}</style>`;
        const { head_html = '', body_html_start = '', body_html_end = '' } = injectionPoints;

        let template = htmlTemplateStr;
        if (!template || typeof template !== 'string') {
            // Default template now includes all placeholders
            template = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>{{{title}}}</title>
        {{{styles}}}
        {{{head_html}}}
    </head>
    <body>
        {{{body_html_start}}}
        {{{body}}}
        {{{body_html_end}}}
    </body>
</html>`;
        }
        
        const finalHtml = template
            .replace('{{{title}}}', pdfOptions.title || 'Document')
            .replace('{{{styles}}}', styles)
            .replace('{{{body}}}', htmlBodyContent)
            .replace('{{{head_html}}}', head_html)
            .replace('{{{body_html_start}}}', body_html_start)
            .replace('{{{body_html_end}}}', body_html_end);

        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

        const finalPdfOptions = {
            path: outputPdfPath,
            format: 'A4',
            printBackground: true,
            ...pdfOptions
        };

        await page.pdf(finalPdfOptions);
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { generatePdf };
