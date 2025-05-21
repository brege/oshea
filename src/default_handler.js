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
} = require('./markdown_utils');

const { generatePdf } = require('./pdf_generator');
const mathIntegration = require('./math_integration'); // Added for Step 0

// Helper functions (resolvePath, substitutePlaceholdersInString, substituteAllPlaceholders)
// ... (these functions remain unchanged)
/**
 * Resolves a dot-separated path string against an object.
 * Case-insensitive for the first key, case-sensitive for subsequent keys.
 */
function resolvePath(object, pathStr) {
    if (typeof pathStr !== 'string' || !object || typeof object !== 'object') {
        return undefined;
    }
    const keys = pathStr.split('.');
    let current = object;

    for (let i = 0; i < keys.length; i++) {
        let keySegment = keys[i];
        if (current === null || typeof current !== 'object') return undefined;

        let actualKeyInCurrentObject;
        if (i === 0) {
            actualKeyInCurrentObject = Object.keys(current).find(k => k.toLowerCase() === keySegment.toLowerCase());
            if (actualKeyInCurrentObject === undefined) return undefined;
        } else {
            if (Object.prototype.hasOwnProperty.call(current, keySegment)) {
                actualKeyInCurrentObject = keySegment;
            } else {
                return undefined;
            }
        }
        current = current[actualKeyInCurrentObject];
    }
    return current;
}

/**
 * Replaces placeholders in a content string.
 */
function substitutePlaceholdersInString(content, context, warningContext = "value") {
    const placeholderRegex = /\{\{\s*\.?([\w.-]+)\s*\}\}/g;
    let changed = false;
    const newContent = content.replace(placeholderRegex, (match, placeholderPath) => {
        const fullPath = placeholderPath.trim();
        const value = resolvePath(context, fullPath);
        if (value !== undefined) {
            const stringValue = (value === null || value === undefined) ? '' : String(value);
            if (stringValue !== match) changed = true;
            return stringValue;
        }
        console.warn(`WARN: Placeholder '{{ ${fullPath} }}' not found during ${warningContext} substitution.`);
        return match;
    });
    return { changed, newContent };
}

/**
 * Iteratively replaces placeholders in front matter and main content.
 */
function substituteAllPlaceholders(mainContent, initialFrontMatterData) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isoDate = today.toISOString().split('T')[0];

    let processingContext = {
        ...initialFrontMatterData,
        CurrentDateFormatted: formattedDate,
        CurrentDateISO: isoDate,
    };

    let fmChangedInLoop = true;
    const maxFmSubstLoops = 5;
    let loopCount = 0;

    while (fmChangedInLoop && loopCount < maxFmSubstLoops) {
        fmChangedInLoop = false;
        loopCount++;
        const nextContext = { ...processingContext };
        for (const key in processingContext) {
            if (Object.prototype.hasOwnProperty.call(processingContext, key) && typeof processingContext[key] === 'string') {
                const substitutionResult = substitutePlaceholdersInString(
                    processingContext[key],
                    processingContext,
                    `front matter key '${key}' (loop ${loopCount})`
                );
                if (substitutionResult.changed) fmChangedInLoop = true;
                nextContext[key] = substitutionResult.newContent;
            }
        }
        processingContext = nextContext;
    }
    if (loopCount === maxFmSubstLoops && fmChangedInLoop) {
        console.warn("WARN: Max substitution loops for front matter. Check for circular placeholders.");
    }
    const { newContent: processedMainContent } = substitutePlaceholdersInString(mainContent, processingContext, "main content");
    return { processedFmData: processingContext, processedContent: processedMainContent };
}

class DefaultHandler {
    /**
     * Default processing logic for Markdown files.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration object for the specific plugin type.
     * @param {Object} globalConfig - The main global configuration object.
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

        const { processedFmData, processedContent: contentAfterFMSubst } =
            substituteAllPlaceholders(contentWithoutFm, initialFrontMatter);

        const patternsToRemove = [
            ...(globalConfig.global_remove_shortcodes || []),
            ...(pluginSpecificConfig.remove_shortcodes_patterns || [])
        ];
        const cleanedContent = removeShortcodes(contentAfterFMSubst, patternsToRemove);

        let finalOutputFilename = outputFilenameOpt;
        if (!finalOutputFilename) {
            const baseInputName = path.basename(markdownFilePath, path.extname(markdownFilePath));
            let nameParts = [];
            const titleFromFM = resolvePath(processedFmData, 'title') || '';
            const titleSlug = generateSlug(titleFromFM);
            nameParts.push(titleSlug || generateSlug(baseInputName));

            const authorFromFM = resolvePath(processedFmData, 'author') || '';
            if (authorFromFM) nameParts.push(generateSlug(authorFromFM));
            
            let dateStrForFilename = '';
            const dateValueFromFM = resolvePath(processedFmData, 'date');
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
        const fmTitleForH1 = resolvePath(processedFmData, 'title');
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
            pluginSpecificConfig.math_rendering 
        );

        const cssFileContentsArray = [];
        // Add math CSS first (if any, via stub in Step 0)
        if (pluginSpecificConfig.math_rendering && pluginSpecificConfig.math_rendering.enabled) {
            const mathCssStrings = await mathIntegration.getMathCssContent(pluginSpecificConfig.math_rendering);
            if (mathCssStrings && mathCssStrings.length > 0) {
                cssFileContentsArray.unshift(...mathCssStrings); // Prepend math CSS
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
        if (cssFileContentsArray.length === 0 && (pluginCssFiles.length > 0 || (pluginSpecificConfig.math_rendering && pluginSpecificConfig.math_rendering.enabled))) {
            // Adjusted warning condition slightly
            let warningMsg = `WARN: No CSS files were actually loaded by the handler.`;
            if (pluginCssFiles.length > 0) {
                const allAbsolute = pluginCssFiles.every(f => path.isAbsolute(f));
                let hint = `Check plugin CSS paths relative to ${pluginBasePath}.`;
                if (allAbsolute) {
                    hint = `Ensure the absolute plugin CSS paths specified exist and are readable: ${pluginCssFiles.join(', ')}`;
                }
                warningMsg += ` Plugin CSS files specified: ${pluginCssFiles.join(', ')}. ${hint}`;
            }
            if (pluginSpecificConfig.math_rendering && pluginSpecificConfig.math_rendering.enabled) {
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
