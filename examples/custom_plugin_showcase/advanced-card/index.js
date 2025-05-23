// examples/custom_plugin_showcase/advanced-card/index.js
const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const path = require('path');

class AdvancedCardHandler {
    constructor(coreUtils) {
        this.markdownUtils = coreUtils.markdownUtils;
        this.pdfGenerator = coreUtils.pdfGenerator;
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        console.log(`INFO (AdvancedCardHandler): Processing for plugin '${pluginSpecificConfig.description || 'advanced-card'}' using Markdown body.`);

        const { markdownFilePath } = data;
        if (!markdownFilePath || !fss.existsSync(markdownFilePath)) {
            throw new Error(`Input Markdown file not found: ${markdownFilePath}`);
        }

        try {
            await fs.mkdir(outputDir, { recursive: true });

            const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
            const { data: fm, content: markdownBody } = this.markdownUtils.extractFrontMatter(rawMarkdownContent);

            const globalParams = globalConfig.params || {};

            // Render the main Markdown body to HTML
            // Pass toc_options and math from pluginSpecificConfig, though likely disabled for a card.
            // Anchor options can be passed from merged PDF options if defined.
            const pdfGenOptions = { // For anchor_options, primarily
                 ...(globalConfig.global_pdf_options || {}),
                 ...(pluginSpecificConfig.pdf_options || {}),
            };
            const renderedMarkdownHtml = this.markdownUtils.renderMarkdownToHtml(
                markdownBody,
                pluginSpecificConfig.toc_options, // Disabled for a card
                pdfGenOptions.anchor_options,     // Pass anchor options if any
                pluginSpecificConfig.math         // Disabled for a card
            );

            // Determine QR code data: use fm.qr_data, then fm.website, then global.defaultWebsite
            const qrDataSource = fm.qr_data || fm.website || globalParams.defaultWebsite || 'https://example.com';
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrDataSource)}`; // Slightly smaller QR

            // Branding color from front matter or global params
            const cardBrandingColor = fm.brandingColor || globalParams.defaultBrandingColor || '#333';

            // Construct custom HTML layout, injecting the rendered Markdown
            const htmlBodyContent = `
                <div class="card-container" style="border-top: 5px solid ${cardBrandingColor};">
                    <div class="main-content-from-markdown">
                        ${renderedMarkdownHtml}
                    </div>
                    <div class="qr-code-section">
                        <img src="${qrCodeUrl}" alt="QR Code for ${qrDataSource}">
                    </div>
                    ${globalParams.companyLogoUrl ? `<img src="${globalParams.companyLogoUrl}" alt="Company Logo" class="company-logo">` : ''}
                </div>
            `;

            // Determine output PDF path
            const cardNameForFile = fm.name || (markdownBody.split('\n')[0].replace(/^#+\s*/, '')) || 'advanced-card';
            const baseOutputFilename = outputFilenameOpt || `${this.markdownUtils.generateSlug(cardNameForFile)}.pdf`;
            const finalOutputPdfPath = path.join(outputDir, baseOutputFilename);

            // Merge PDF options (plugin's own config should define card dimensions)
            const pdfOptions = {
                ...(globalConfig.global_pdf_options || {}),
                ...(pluginSpecificConfig.pdf_options || {}),
                margin: {
                    ...((globalConfig.global_pdf_options || {}).margin || {}),
                    ...((pluginSpecificConfig.pdf_options || {}).margin || {}),
                }
            };
            if (pdfOptions.width || pdfOptions.height) {
                delete pdfOptions.format; // Prioritize explicit width/height
            }

            // Load CSS files
            const cssFileContentsArray = [];
            if (pluginSpecificConfig.css_files && Array.isArray(pluginSpecificConfig.css_files)) {
                for (const cssFile of pluginSpecificConfig.css_files) {
                    const cssFilePath = path.resolve(pluginBasePath, cssFile);
                    if (fss.existsSync(cssFilePath)) {
                        cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
                    } else {
                        console.warn(`WARN (AdvancedCardHandler): CSS file not found at ${cssFilePath}`);
                    }
                }
            }

            await this.pdfGenerator.generatePdf(
                htmlBodyContent,
                finalOutputPdfPath,
                pdfOptions,
                cssFileContentsArray
            );

            console.log(`Successfully generated PDF: ${finalOutputPdfPath}`);
            return finalOutputPdfPath;

        } catch (error) {
            console.error(`ERROR (AdvancedCardHandler): Failed to generate card for ${markdownFilePath}: ${error.message}`);
            if (error.stack) {
                console.error(error.stack);
            }
            throw error;
        }
    }
}
module.exports = AdvancedCardHandler;
