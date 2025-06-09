// src/default_handler.js
const fs = require('fs').promises;
const fss = 'fs'; // Synchronous for operations like existsSync
const path = require('path');

const {
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    generateSlug,
    ensureAndPreprocessHeading,
    substituteAllPlaceholders
} = require('./markdown_utils');

const { generatePdf } = require('./pdf_generator');
const mathIntegration = require('./math_integration');

class DefaultHandler {
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const { markdownFilePath } = data;
        
        try {
            if (!markdownFilePath || !require('fs').existsSync(markdownFilePath)) {
                throw new Error(`Input Markdown file not found: ${markdownFilePath}`);
            }
            await fs.mkdir(outputDir, { recursive: true });

            const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
            const { data: initialFrontMatter, content: contentWithoutFm } = extractFrontMatter(rawMarkdownContent);

            let contextForPlaceholders = {};

            if (globalConfig && globalConfig.params && typeof globalConfig.params === 'object') {
                contextForPlaceholders = { ...globalConfig.params };
            }

            if (pluginSpecificConfig && pluginSpecificConfig.params && typeof pluginSpecificConfig.params === 'object') {
                contextForPlaceholders = {
                    ...contextForPlaceholders,
                    ...pluginSpecificConfig.params
                };
            }

            contextForPlaceholders = {
                ...contextForPlaceholders,
                ...initialFrontMatter
            };

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
                const titleFromFM = processedFmData.title || '';
                const titleSlug = generateSlug(titleFromFM);
                nameParts.push(titleSlug || generateSlug(baseInputName));

                const authorFromFM = processedFmData.author || '';
                if (authorFromFM) nameParts.push(generateSlug(authorFromFM));
                
                let dateStrForFilename = '';
                const dateValueFromFM = processedFmData.date;
                 if (dateValueFromFM) {
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
            const fmTitleForH1 = processedFmData.title;
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
                pluginSpecificConfig.math,
                null, // mdInstance - not used in this flow
                pluginSpecificConfig.markdown_it_options // Pass the options object
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
                if (require('fs').existsSync(cssFilePath)) {
                    cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
                } else {
                    if (path.isAbsolute(cssFileName) && require('fs').existsSync(cssFileName)) {
                        cssFileContentsArray.push(await fs.readFile(cssFileName, 'utf8'));
                    } else {
                        console.warn(`WARN: CSS file for plugin not found: ${cssFilePath} (referenced by ${pluginSpecificConfig.description || 'plugin'}) (original path in config: ${cssFileName})`);
                    }
                }
            }

            if (cssFileContentsArray.length === 0 && (pluginCssFiles.length > 0 || (pluginSpecificConfig.math && pluginSpecificConfig.math.enabled))) {
                let warningMsg = `WARN: No CSS files were actually loaded by the handler.`;
                if (pluginCssFiles.length > 0) {
                    const allAbsolute = pluginCssFiles.every(f => typeof f === 'string' && path.isAbsolute(f));
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
        } catch (error) {
            console.error(`Error during document generation: ${error.message}`, error.stack || '');
            return null;
        }
    }
}

module.exports = DefaultHandler;
