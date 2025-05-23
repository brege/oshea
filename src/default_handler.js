// src/default_handler.js
const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const path = require('path');

const {
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    generateSlug,
    ensureAndPreprocessHeading,
    substituteAllPlaceholders // Imported substituteAllPlaceholders
} = require('./markdown_utils');

const { generatePdf } = require('./pdf_generator');
const mathIntegration = require('./math_integration');

// Helper functions (resolvePath, substitutePlaceholdersInString) are now primarily
// used within substituteAllPlaceholders in markdown_utils.js.
// If they were previously defined here and also in markdown_utils.js,
// ensure we are using the ones from markdown_utils.js consistently.
// For this change, we are focusing on the context preparation.


class DefaultHandler {
    /**
     * Default processing logic for Markdown files.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration object for the specific plugin type.
     * @param {Object} globalConfig - The main global configuration object (this will contain `params`).
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of the plugin, for resolving its assets.
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const { markdownFilePath } = data;
        if (!markdownFilePath || !fss.existsSync(markdownFilePath)) {
            throw new Error(`Input Markdown file not found: ${markdownFilePath}`);
        }
        await fs.mkdir(outputDir, { recursive: true });

        const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
        const { data: initialFrontMatter, content: contentWithoutFm } = extractFrontMatter(rawMarkdownContent);

        // Prepare the initial context for placeholder substitution, merging global params and front matter.
        let contextForPlaceholders = {};
        if (globalConfig && globalConfig.params && typeof globalConfig.params === 'object') {
            contextForPlaceholders = { ...globalConfig.params };
        }
        // Document front matter overrides global params
        contextForPlaceholders = {
            ...contextForPlaceholders,
            ...initialFrontMatter
        };

        // substituteAllPlaceholders will handle iterative substitution and add date placeholders.
        const { processedFmData, processedContent: contentAfterFMSubst } =
            substituteAllPlaceholders(contentWithoutFm, contextForPlaceholders);

        const patternsToRemove = [
            ...(globalConfig.global_remove_shortcodes || []),
            ...(pluginSpecificConfig.remove_shortcodes_patterns || [])
        ];
        const cleanedContent = removeShortcodes(contentAfterFMSubst, patternsToRemove);

        let finalOutputFilename = outputFilenameOpt;
        if (!finalOutputFilename) {
            const baseInputName = path.basename(markdownFilePath, path.extname(markdownFilePath));
            let nameParts = [];
            // Use resolvePath (if it were still here) or assume processedFmData has direct access
            const titleFromFM = processedFmData.title || ''; // Access directly from processedFmData
            const titleSlug = generateSlug(titleFromFM);
            nameParts.push(titleSlug || generateSlug(baseInputName));

            const authorFromFM = processedFmData.author || ''; // Access directly
            if (authorFromFM) nameParts.push(generateSlug(authorFromFM));
            
            let dateStrForFilename = '';
            const dateValueFromFM = processedFmData.date; // Access directly
             if (dateValueFromFM) {
                // Check against CurrentDateISO which substituteAllPlaceholders adds to processedFmData
                if (dateValueFromFM === processedFmData.CurrentDateISO) {
                    dateStrForFilename = processedFmData.CurrentDateISO;
                } else if (typeof dateValueFromFM === 'string') {
                    const match = dateValueFromFM.match(/^\d{4}-\d{2}-\d{2}/);
                    if (match) dateStrForFilename = match[0];
                }
            }
            if (dateStrForFilename) nameParts.push(dateStrForFilename);
            
            finalOutputFilename = nameParts.filter(part => part && String(part).trim() !== '').join('-');
            finalOutputFilename = finalOutputFilename.replace(/--+/g, '-') + '.pdf';
            if (finalOutputFilename === '.pdf' || finalOutputFilename === '-.pdf') {
                finalOutputFilename = generateSlug(baseInputName) + '.pdf';
            }
        }
         if (!finalOutputFilename.toLowerCase().endsWith('.pdf')) {
            finalOutputFilename += '.pdf';
        }
        const outputPdfPath = path.join(outputDir, finalOutputFilename);

        let markdownToRender = cleanedContent;
        const fmTitleForH1 = processedFmData.title; // Access directly
        if (pluginSpecificConfig.inject_fm_title_as_h1 && fmTitleForH1) {
            markdownToRender = ensureAndPreprocessHeading(
                cleanedContent,
                String(fmTitleForH1),
                !!pluginSpecificConfig.aggressiveHeadingCleanup
            );
        } else if (!pluginSpecificConfig.inject_fm_title_as_h1 && !cleanedContent.trim().startsWith('# ') && !fmTitleForH1) {
             console.warn(`WARN: Document "${markdownFilePath}" does not appear to have an H1 title.`);
        }

        const mergedPdfOptions = {
            ...(globalConfig.global_pdf_options || {}),
            ...(pluginSpecificConfig.pdf_options || {}),
            margin: { 
                ...((globalConfig.global_pdf_options || {}).margin || {}),
                ...((pluginSpecificConfig.pdf_options || {}).margin || {}),
            }
        };
        
        const htmlBodyContent = renderMarkdownToHtml(
            markdownToRender,
            pluginSpecificConfig.toc_options,
            mergedPdfOptions.anchor_options,
            pluginSpecificConfig.math
        );

        const cssFileContentsArray = [];
        if (pluginSpecificConfig.math && pluginSpecificConfig.math.enabled) {
            const mathCssStrings = await mathIntegration.getMathCssContent(pluginSpecificConfig.math);
            if (mathCssStrings && mathCssStrings.length > 0) {
                cssFileContentsArray.unshift(...mathCssStrings);
            }
        }

        const pluginCssFiles = pluginSpecificConfig.css_files || [];
        for (const cssFileName of pluginCssFiles) {
            const cssFilePath = path.resolve(pluginBasePath, cssFileName);
            if (fss.existsSync(cssFilePath)) {
                cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
            } else {
                console.warn(`WARN: CSS file for plugin not found: ${cssFilePath} (referenced by ${pluginSpecificConfig.description || 'plugin'})`);
            }
        }
        if (cssFileContentsArray.length === 0 && (pluginCssFiles.length > 0 || (pluginSpecificConfig.math && pluginSpecificConfig.math.enabled))) {
            let warningMsg = `WARN: No CSS files were actually loaded by the handler.`;
            if (pluginCssFiles.length > 0) {
                const allAbsolute = pluginCssFiles.every(f => path.isAbsolute(f));
                let hint = `Check plugin CSS paths relative to ${pluginBasePath}.`;
                if (allAbsolute) {
                    hint = `Ensure the absolute plugin CSS paths specified exist and are readable: ${pluginCssFiles.join(', ')}`;
                }
                warningMsg += ` Plugin CSS files specified: ${pluginCssFiles.join(', ')}. ${hint}`;
            }
            if (pluginSpecificConfig.math && pluginSpecificConfig.math.enabled) {
                warningMsg += ` Math rendering was enabled, but its CSS might also be missing.`;
            }
            console.warn(warningMsg);
        }

        await generatePdf(
            htmlBodyContent,
            outputPdfPath,
            mergedPdfOptions, 
            cssFileContentsArray
        );

        return outputPdfPath;
    }
}

module.exports = DefaultHandler;
