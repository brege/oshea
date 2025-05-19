// src/hugo_export_each.js

/**
 * @fileoverview Defines the HugoExportEach class, which is responsible for
 * processing a directory of Hugo-structured content (typically recipes).
 * It generates individual PDF files for each content item, applying specific
 * naming conventions like "slug-author-date.pdf". This involves extracting
 * metadata (title, date from front matter; author from content), cleaning
 * Hugo-specific shortcodes, and then converting each item to PDF.
 * @version 1.1.0 // Version bump for comment refinement
 * @date 2025-05-18
 */

const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync and statSync
const path = require('path');

const {
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    generateSlug,
    ensureAndPreprocessHeading,
} = require('./markdown_utils');

const { generatePdf } = require('./pdf_generator');

/**
 * @class HugoExportEach
 * Handles batch PDF generation for Hugo content items.
 */
class HugoExportEach {
    /**
     * Extracts an author string from Markdown body content using configured regex patterns
     * and converts it into a slug. Handles "et-al" for multiple authors if `isListRegexStr` matches.
     *
     * @private
     * @param {string} bodyContent - The Markdown body content of the item.
     * @param {string} [mainRegexStr] - The primary regex string (as a string) to capture author name(s).
     * The first capture group is expected to contain the author(s).
     * @param {string} [isListRegexStr] - An optional regex string (as a string) to check if the `mainRegexStr`
     * match indicates a list of authors (e.g., matching "Chefs:" vs "Chef:"). If it matches
     * and multiple authors are implied by comma separation in the captured group, formats as "firstauthor-et-al".
     * @returns {string} The slugified author name (e.g., "john-doe" or "jane-doe-et-al"),
     * or an empty string if no author is found or regex fails.
     */
    _extractAuthorSlugFromContent(bodyContent, mainRegexStr, isListRegexStr) {
        if (!mainRegexStr || typeof bodyContent !== 'string') return '';
        try {
            const mainRegex = new RegExp(mainRegexStr, 'im'); // 'i' for case-insensitive, 'm' for multi-line
            const match = bodyContent.match(mainRegex);

            if (match && match[1]) { // Ensure a match and a capture group exist
                let authorName = match[1].trim();
                if (isListRegexStr) {
                    const isListRegex = new RegExp(isListRegexStr, 'im');
                    // Check if the broader context of the match implies multiple authors (e.g., "Chefs:")
                    if (isListRegex.test(match[0])) {
                        const firstAuthor = authorName.split(',')[0].trim();
                        if (firstAuthor) {
                            // Check if there are other authors actually listed after the first comma
                            const otherAuthorsPart = authorName.substring(firstAuthor.length).trim();
                            if (otherAuthorsPart.startsWith(',') && otherAuthorsPart.length > 1) {
                                return `${generateSlug(firstAuthor)}-et-al`;
                            }
                            return generateSlug(firstAuthor); // Only one author effectively, or no clear "et al" structure
                        }
                    }
                }
                // If not a list or only one author, slugify the whole captured group
                return generateSlug(authorName);
            }
        } catch (e) {
            console.warn(`WARN: Error during author extraction regex execution: ${e.message}`);
        }
        return ''; // Default to empty string if no match or error
    }

    /**
     * Processes all Hugo recipe/content items in a given source directory,
     * exporting each as an individual PDF. Applies specific naming conventions
     * (slug-author-date.pdf) and skips generation if the PDF is already up-to-date.
     *
     * @async
     * @param {string} sourceDir - Absolute path to the source directory containing Hugo content items
     * (e.g., a 'recipes' directory with subdirectories for each recipe).
     * @param {Object} itemBaseConfig - The resolved base configuration (e.g., from 'recipe' type)
     * to use for styling (CSS) and PDF options (margins, format) of each exported item.
     * @param {Object} hugoExportRules - Specific rules for this export process, typically from
     * `config.yaml` under `hugo_export_each.<rulesetName>`. Contains settings like
     * `author_extraction_regex`, `author_is_list_regex`, and `additional_shortcodes_to_remove`.
     * @param {Object} fullConfig - The full global configuration object, primarily for accessing
     * `global_remove_shortcodes`.
     * @param {boolean} noOpen - Flag from CLI to indicate whether PDFs should be opened (true means no open).
     * This module respects the flag but relies on `cli.js` for actual opening.
     * @returns {Promise<Array<string>>} A list of absolute paths to the generated or confirmed up-to-date PDF files.
     * @throws {Error} If the source directory is not found.
     */
    async exportAllPdfs(sourceDir, itemBaseConfig, hugoExportRules, fullConfig, noOpen) {
        if (!fss.existsSync(sourceDir)) {
            throw new Error(`Source directory for Hugo export not found: ${sourceDir}`);
        }

        const generatedPdfPaths = [];
        const dirents = await fs.readdir(sourceDir, { withFileTypes: true });

        // Consolidate shortcode removal patterns: global, then Hugo-export-specific.
        // itemBaseConfig.remove_shortcodes_patterns are generally for that *type* when converted directly,
        // not necessarily when sourced from Hugo, so hugoExportRules take precedence here after global.
        const globalShortcodes = fullConfig.global_remove_shortcodes || [];
        const hugoSpecificShortcodes = hugoExportRules.additional_shortcodes_to_remove || [];
        const allShortcodePatternsToRemove = [...new Set([...globalShortcodes, ...hugoSpecificShortcodes])];

        for (const dirent of dirents) {
            let mdFilePath = null;
            let itemSlug = '';
            let itemOutputDir = ''; // Directory where the PDF for this item will be saved.

            // --- Discover Markdown Files ---
            // Priority 1: Hugo leaf bundle (index.md within a subdirectory named as the slug)
            if (dirent.isDirectory()) {
                const potentialIndexPath = path.join(sourceDir, dirent.name, 'index.md');
                if (fss.existsSync(potentialIndexPath)) {
                    mdFilePath = potentialIndexPath;
                    itemSlug = dirent.name; // Slug is the directory name
                    itemOutputDir = path.join(sourceDir, dirent.name); // Output PDF in the same directory
                }
            }
            // Priority 2: Standalone .md file in the sourceDir (less common for Hugo sections)
            else if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.md')) {
                mdFilePath = path.join(sourceDir, dirent.name);
                itemSlug = path.basename(dirent.name, path.extname(dirent.name)); // Slug from filename
                itemOutputDir = sourceDir; // Output PDF in the main sourceDir
            }

            if (!mdFilePath) {
                continue; // Skip if not a recognized Markdown content structure
            }

            console.log(`Processing for hugo-export-each: ${mdFilePath}`);
            try {
                const rawContent = await fs.readFile(mdFilePath, 'utf8');
                const { data: frontMatter, content: bodyContent } = extractFrontMatter(rawContent);

                // --- Filename Generation Metadata ---
                const itemTitle = frontMatter.title || itemSlug.replace(/-/g, ' '); // Fallback title from slug
                let itemDate = ''; // YYYY-MM-DD format
                if (frontMatter.date) {
                    if (frontMatter.date instanceof Date) {
                        itemDate = frontMatter.date.toISOString().split('T')[0];
                    } else if (typeof frontMatter.date === 'string') {
                        const dateMatch = frontMatter.date.match(/^\d{4}-\d{2}-\d{2}/); // Extract YYYY-MM-DD
                        if (dateMatch) itemDate = dateMatch[0];
                    }
                }
                const authorSlug = this._extractAuthorSlugFromContent(
                    bodyContent,
                    hugoExportRules.author_extraction_regex,
                    hugoExportRules.author_is_list_regex
                );

                // Construct the PDF filename: slug-author-date.pdf
                let pdfFilename = generateSlug(itemSlug); // Ensure itemSlug itself is clean
                if (authorSlug) pdfFilename += `-${authorSlug}`;
                if (itemDate) pdfFilename += `-${itemDate}`;
                pdfFilename += '.pdf';
                pdfFilename = pdfFilename.replace(/--+/g, '-'); // Consolidate multiple hyphens

                const outputPdfPath = path.join(itemOutputDir, pdfFilename);

                // --- Modification Time Check ---
                // Skip PDF generation if the Markdown source hasn't changed since the PDF was last generated.
                if (fss.existsSync(outputPdfPath)) {
                    const mdStat = fss.statSync(mdFilePath);
                    const pdfStat = fss.statSync(outputPdfPath);
                    if (mdStat.mtimeMs <= pdfStat.mtimeMs) {
                        console.log(`  Skipping (PDF is up-to-date): ${pdfFilename}`);
                        generatedPdfPaths.push(outputPdfPath); // Still report it as processed
                        continue;
                    }
                    console.log(`  Re-generating (Markdown is newer): ${pdfFilename}`);
                } else {
                    console.log(`  Generating new PDF: ${pdfFilename}`);
                }

                // --- Content Processing ---
                const cleanedBodyContent = removeShortcodes(bodyContent, allShortcodePatternsToRemove);
                // For individual Hugo exports, generally treat heading like a standard document (isRecipeBookItem = false).
                // Aggressive cleanup for these items can be controlled via itemBaseConfig if needed.
                const finalMarkdownToRender = ensureAndPreprocessHeading(
                    cleanedBodyContent,
                    itemTitle,
                    itemBaseConfig.aggressiveHeadingCleanup || false
                );

                const htmlBodyContent = renderMarkdownToHtml(
                    finalMarkdownToRender,
                    itemBaseConfig.toc_options,
                    itemBaseConfig.pdf_options?.anchor_options
                );

                // --- CSS Loading ---
                const cssFileContentsArray = [];
                const projectRootDir = path.dirname(require.main.filename || process.cwd());
                const cssDir = path.join(projectRootDir, 'css');
                for (const cssFileName of itemBaseConfig.css_files) {
                    const cssFilePath = path.join(cssDir, cssFileName);
                    if (fss.existsSync(cssFilePath)) {
                        cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
                    } else {
                        console.warn(`WARN: CSS file for Hugo item not found: ${cssFilePath}`);
                    }
                }

                // --- PDF Generation ---
                await generatePdf(
                    htmlBodyContent,
                    outputPdfPath,
                    itemBaseConfig.pdf_options, // Use PDF options from the item's base type config
                    cssFileContentsArray
                );
                generatedPdfPaths.push(outputPdfPath);
                console.log(`  Successfully generated: ${outputPdfPath}`);

                // Note: PDF opening is handled by cli.js based on the --no-open flag.
                // This module does not directly invoke `openPdf` for batch operations.

            } catch (itemError) {
                console.error(`ERROR processing Hugo item "${mdFilePath}": ${itemError.message}`);
                if (itemError.stack) console.error(itemError.stack); // Log stack for better debugging
                // Continue with the next item in the batch
            }
        }
        console.log(`Hugo PDF export-each complete. ${generatedPdfPaths.length} PDFs processed/checked.`);
        return generatedPdfPaths;
    }
}

module.exports = HugoExportEach;
