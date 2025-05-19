// src/document_processor.js

/**
 * @fileoverview Class responsible for processing a single Markdown document into a PDF.
 * It orchestrates front matter extraction, placeholder substitution (including dynamic dates),
 * shortcode removal, Markdown rendering, and PDF generation by leveraging other utility modules.
 * @version 1.3.0
 * @date 2025-05-18
 */

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

const { generatePdf } = require('./pdf_generator'); // Corrected import name

/**
 * Resolves a dot-separated path string against an object.
 * The first key in the path is matched case-insensitively against the object's top-level keys.
 * Subsequent keys in the path are matched case-sensitively.
 *
 * @param {Object} object - The object to traverse.
 * @param {string} pathStr - The dot-separated path string (e.g., "job_title", "company.name", "currentDateISO").
 * @returns {*} The value at the specified path, or undefined if the path is invalid or not found.
 */
function resolvePath(object, pathStr) {
    if (typeof pathStr !== 'string' || !object || typeof object !== 'object') {
        return undefined;
    }
    const keys = pathStr.split('.');
    let current = object;

    for (let i = 0; i < keys.length; i++) {
        let keySegment = keys[i];
        if (current === null || typeof current !== 'object') {
            return undefined; // Path cannot be resolved further
        }

        let actualKeyInCurrentObject;
        if (i === 0) { // First key segment: case-insensitive lookup
            actualKeyInCurrentObject = Object.keys(current).find(k => k.toLowerCase() === keySegment.toLowerCase());
            if (actualKeyInCurrentObject === undefined) return undefined;
        } else { // Subsequent key segments: case-sensitive lookup
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
 * Replaces placeholders in a content string with values from a context object.
 * Handles placeholders like `{{ key }}`, `{{ .key }}`, `{{ path.to.key }}`, or `{{ .path.to.key }}`.
 * Uses `resolvePath` for robust key/path lookup within the context.
 *
 * @param {string} content - The string containing placeholders.
 * @param {Object} context - The data object providing values for substitution.
 * @param {string} [warningContext="value"] - Descriptive string for warning messages (e.g., "front matter", "content").
 * @returns {{changed: boolean, newContent: string}} An object indicating if any substitutions occurred
 * and the content string with placeholders replaced.
 */
function substitutePlaceholdersInString(content, context, warningContext = "value") {
    const placeholderRegex = /\{\{\s*\.?([\w.-]+)\s*\}\}/g; // Matches {{ key }}, {{ .key }}, etc.
    let changed = false;
    const newContent = content.replace(placeholderRegex, (match, placeholderPath) => {
        const fullPath = placeholderPath.trim();
        const value = resolvePath(context, fullPath);

        if (value !== undefined) {
            const stringValue = (value === null || value === undefined) ? '' : String(value);
            if (stringValue !== match) { // Check if the actual replacement differs from the placeholder itself
                changed = true;
            }
            return stringValue;
        }
        // Placeholder not found in context
        console.warn(`WARN: Placeholder '{{ ${fullPath} }}' not found during ${warningContext} substitution. Placeholder will remain.`);
        return match; // Return the original placeholder if not found
    });
    return { changed, newContent };
}


/**
 * Iteratively replaces placeholders within an object's string values and in a main content string.
 * This iterative process allows front matter placeholders to refer to other front matter values
 * (e.g., a title derived from other front matter fields) or dynamic dates.
 * Adds dynamic date placeholders `{{ .CurrentDateFormatted }}` and `{{ .CurrentDateISO }}` to the context.
 *
 * @param {string} mainContent - The main Markdown content string (with potential placeholders).
 * @param {Object} initialFrontMatterData - The initially parsed front matter data.
 * @returns {{processedFmData: Object, processedContent: string}} An object containing:
 * - `processedFmData`: The front matter data after its own string values have undergone substitution.
 * - `processedContent`: The main content string after substitution using the processed front matter and dynamic dates.
 */
function substituteAllPlaceholders(mainContent, initialFrontMatterData) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isoDate = today.toISOString().split('T')[0];

    // Initial context for substitution includes original front matter and dynamic dates.
    // Keys for dynamic dates (e.g., `CurrentDateFormatted`) must match how they are referenced in placeholders.
    let processingContext = {
        ...initialFrontMatterData,
        CurrentDateFormatted: formattedDate,
        CurrentDateISO: isoDate,
    };

    let fmChangedInLoop = true;
    const maxFmSubstLoops = 5; // Limit iterations to prevent infinite loops from circular dependencies.
    let loopCount = 0;

    // Iteratively substitute placeholders within the front matter itself.
    while (fmChangedInLoop && loopCount < maxFmSubstLoops) {
        fmChangedInLoop = false;
        loopCount++;
        const nextContext = { ...processingContext }; // Create a new object for the next iteration's state

        for (const key in processingContext) {
            if (Object.prototype.hasOwnProperty.call(processingContext, key) && typeof processingContext[key] === 'string') {
                const substitutionResult = substitutePlaceholdersInString(
                    processingContext[key],
                    processingContext, // Use the current state of context for lookups
                    `front matter key '${key}' (loop ${loopCount})`
                );
                if (substitutionResult.changed) {
                    fmChangedInLoop = true;
                }
                nextContext[key] = substitutionResult.newContent;
            }
        }
        processingContext = nextContext; // Update context with substituted values for the next loop or final use
    }

    if (loopCount === maxFmSubstLoops && fmChangedInLoop) {
        console.warn("WARN: Maximum substitution loops reached for front matter. Check for circular placeholder references in front matter data.");
    }

    // Substitute placeholders in the main content using the fully processed front matter context.
    const { newContent: processedMainContent } = substitutePlaceholdersInString(mainContent, processingContext, "main content");

    return { processedFmData: processingContext, processedContent: processedMainContent };
}


class DocumentProcessor {
    /**
     * Processes a single Markdown file: reads, extracts front matter, substitutes placeholders,
     * cleans content, renders to HTML, and generates a PDF.
     *
     * @async
     * @param {string} markdownFilePath - Absolute path to the input Markdown file.
     * @param {Object} docTypeConfig - Resolved configuration for the document type, including
     * CSS, PDF options, TOC settings, shortcode patterns, and processing flags.
     * @param {string} outputDir - Absolute path to the directory where the PDF will be saved.
     * @param {string} [outputFilenameOpt] - Optional. If provided, this exact filename is used for the PDF.
     * Otherwise, a filename is generated based on front matter or input file name.
     * @param {Object} fullConfig - The full global configuration object (unused directly here but available for future needs or deeper module calls).
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     * @throws {Error} If any step of the processing fails.
     */
    async process(markdownFilePath, docTypeConfig, outputDir, outputFilenameOpt, fullConfig) {
        if (!fss.existsSync(markdownFilePath)) {
            throw new Error(`Input Markdown file not found: ${markdownFilePath}`);
        }
        await fs.mkdir(outputDir, { recursive: true });

        const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
        const { data: initialFrontMatter, content: contentWithoutFm } = extractFrontMatter(rawMarkdownContent);

        // Perform placeholder substitutions in front matter and main content
        const { processedFmData, processedContent: contentAfterFMSubst } =
            substituteAllPlaceholders(contentWithoutFm, initialFrontMatter);

        // Remove shortcodes using patterns from the document type configuration
        const patternsToRemove = docTypeConfig.remove_shortcodes_patterns || [];
        const cleanedContent = removeShortcodes(contentAfterFMSubst, patternsToRemove);

        let finalOutputFilename = outputFilenameOpt;
        if (!finalOutputFilename) {
            // --- Filename Generation Logic ---
            // Generates a filename based on title, author, and date from processed front matter,
            // or falls back to the original Markdown filename.
            const baseInputName = path.basename(markdownFilePath, path.extname(markdownFilePath));
            let nameParts = [];

            // Resolve 'title', 'author', 'date' from potentially substituted front matter
            const titleFromFM = resolvePath(processedFmData, 'title') || '';
            const titleSlug = generateSlug(titleFromFM);
            nameParts.push(titleSlug || generateSlug(baseInputName)); // Fallback to input name if title is empty

            const authorFromFM = resolvePath(processedFmData, 'author') || '';
            const authorSlug = generateSlug(authorFromFM);
            if (authorSlug) nameParts.push(authorSlug);

            let dateStrForFilename = '';
            const dateValueFromFM = resolvePath(processedFmData, 'date');
            if (dateValueFromFM) {
                // Check if the date is one of the dynamically generated ISO dates
                if (dateValueFromFM === processedFmData.CurrentDateISO) {
                    dateStrForFilename = processedFmData.CurrentDateISO;
                } else if (typeof dateValueFromFM === 'string') {
                    const match = dateValueFromFM.match(/^\d{4}-\d{2}-\d{2}/); // Match YYYY-MM-DD format
                    if (match) dateStrForFilename = match[0];
                }
                // Note: instanceof Date check might be redundant if all FM dates are strings after substitution
            }
            if (dateStrForFilename) nameParts.push(dateStrForFilename);

            finalOutputFilename = nameParts.filter(part => part && String(part).trim() !== '').join('-');
            finalOutputFilename = finalOutputFilename.replace(/--+/g, '-') + '.pdf'; // Consolidate hyphens
            if (finalOutputFilename === '.pdf' || finalOutputFilename === '-.pdf') { // Handle edge case of empty parts
                finalOutputFilename = generateSlug(baseInputName) + '.pdf';
            }
        }
        if (!finalOutputFilename.toLowerCase().endsWith('.pdf')) {
            finalOutputFilename += '.pdf';
        }
        const outputPdfPath = path.join(outputDir, finalOutputFilename);

        // --- Heading Preprocessing ---
        let markdownToRender = cleanedContent;
        const fmTitleForH1 = resolvePath(processedFmData, 'title'); // Get title from (potentially substituted) FM
        const useAggressiveCleanup = !!docTypeConfig.aggressiveHeadingCleanup;
        const injectFmTitleAsH1 = !!docTypeConfig.inject_fm_title_as_h1;

        // Prepend H1 if title exists and either aggressive cleanup or injection is enabled.
        if (fmTitleForH1 && (injectFmTitleAsH1 || useAggressiveCleanup)) {
            markdownToRender = ensureAndPreprocessHeading(
                cleanedContent,
                String(fmTitleForH1), // Ensure title is a string
                useAggressiveCleanup  // Aggressive cleanup only if specifically set
            );
        } else if (!cleanedContent.trim().startsWith('# ')) {
             // Warn if no H1 exists in content and no injection logic was triggered based on config/FM title.
            if (injectFmTitleAsH1 && !fmTitleForH1) {
                console.warn(`WARN: Document "${markdownFilePath}" has 'inject_fm_title_as_h1' enabled, but no 'title' was found in front matter. Content does not start with H1.`);
            } else if (!injectFmTitleAsH1 && !useAggressiveCleanup && !fmTitleForH1) {
                console.warn(`WARN: Document "${markdownFilePath}" does not appear to have an H1 title (neither in front matter for injection nor at the start of content).`);
            }
        }

        const htmlBodyContent = renderMarkdownToHtml(
            markdownToRender,
            docTypeConfig.toc_options,
            docTypeConfig.pdf_options?.anchor_options
        );

        // --- CSS Loading ---
        const cssFileContentsArray = [];
        const projectRootDir = path.dirname(require.main.filename || process.cwd());
        const cssDir = path.join(projectRootDir, 'css');

        for (const cssFileName of docTypeConfig.css_files) {
            const cssFilePath = path.join(cssDir, cssFileName);
            if (fss.existsSync(cssFilePath)) {
                cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
            } else {
                console.warn(`WARN: CSS file not found: ${cssFilePath}`);
            }
        }
        if (cssFileContentsArray.length === 0 && docTypeConfig.css_files && docTypeConfig.css_files.length > 0) {
            console.warn(`WARN: No CSS files were actually loaded for document type, though some were specified: ${docTypeConfig.css_files.join(', ')}. Check paths and 'css/' directory.`);
        }

        await generatePdf(
            htmlBodyContent,
            outputPdfPath,
            docTypeConfig.pdf_options,
            cssFileContentsArray
        );

        return outputPdfPath;
    }
}

module.exports = DocumentProcessor;
