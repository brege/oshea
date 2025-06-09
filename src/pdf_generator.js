// src/pdf_generator.js
const puppeteer = require('puppeteer');
const path = require('path');

async function generatePdf(htmlBodyContent, outputPdfPath, pdfOptions, cssFileContentsArray, htmlTemplateStr = null) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        const styles = `<style>${cssFileContentsArray.join('\n')}</style>`;
        
        let finalHtml;
        if (htmlTemplateStr && typeof htmlTemplateStr === 'string') {
            finalHtml = htmlTemplateStr
                .replace('{{{title}}}', pdfOptions.title || 'Document')
                .replace('{{{styles}}}', styles)
                .replace('{{{body}}}', htmlBodyContent);
        } else {
            // Fallback to the default template if none is provided
            finalHtml = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>${pdfOptions.title || 'Document'}</title>
        ${styles}
    </head>
    <body>
        ${htmlBodyContent}
    </body>
</html>`;
        }
        
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
