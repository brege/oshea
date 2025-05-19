// src/hugo_export_each.js

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

class HugoExportEach {
    _extractAuthorSlugFromContent(bodyContent, mainRegexStr, isListRegexStr) {
        if (!mainRegexStr || typeof bodyContent !== 'string') return '';
        try {
            const mainRegex = new RegExp(mainRegexStr, 'im');
            const match = bodyContent.match(mainRegex);

            if (match && match[1]) {
                let authorName = match[1].trim();
                if (isListRegexStr) {
                    const isListRegex = new RegExp(isListRegexStr, 'im');
                    if (isListRegex.test(match[0])) {
                        const firstAuthor = authorName.split(',')[0].trim();
                        if (firstAuthor) {
                            const otherAuthorsPart = authorName.substring(firstAuthor.length).trim();
                            if (otherAuthorsPart.startsWith(',') && otherAuthorsPart.length > 1) {
                                return `${generateSlug(firstAuthor)}-et-al`;
                            }
                            return generateSlug(firstAuthor);
                        }
                    }
                }
                return generateSlug(authorName);
            }
        } catch (e) {
            console.warn(`WARN: Error during author extraction regex: ${e.message}`);
        }
        return '';
    }

    async exportAllPdfs(sourceDir, itemBasePluginConfig, hugoExportRules, fullConfig, noOpen, itemBasePluginPath) {
        if (!fss.existsSync(sourceDir)) {
            throw new Error(`Source directory for Hugo export not found: ${sourceDir}`);
        }

        const generatedPdfPaths = [];
        const dirents = await fs.readdir(sourceDir, { withFileTypes: true });

        const globalShortcodes = fullConfig.global_remove_shortcodes || [];
        const hugoSpecificShortcodes = hugoExportRules.additional_shortcodes_to_remove || [];
        const allShortcodePatternsToRemove = [...new Set([...globalShortcodes, ...hugoSpecificShortcodes])];

        for (const dirent of dirents) {
            let mdFilePath = null;
            let itemSlug = '';
            let itemOutputDir = '';

            if (dirent.isDirectory()) {
                const potentialIndexPath = path.join(sourceDir, dirent.name, 'index.md');
                if (fss.existsSync(potentialIndexPath)) {
                    mdFilePath = potentialIndexPath;
                    itemSlug = dirent.name;
                    itemOutputDir = path.join(sourceDir, dirent.name);
                }
            } else if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.md')) {
                mdFilePath = path.join(sourceDir, dirent.name);
                itemSlug = path.basename(dirent.name, path.extname(dirent.name));
                itemOutputDir = sourceDir;
            }

            if (!mdFilePath) {
                continue;
            }

            console.log(`Processing for hugo-export-each: ${mdFilePath}`);
            try {
                const rawContent = await fs.readFile(mdFilePath, 'utf8');
                const { data: frontMatter, content: bodyContent } = extractFrontMatter(rawContent);

                const itemTitle = frontMatter.title || itemSlug.replace(/-/g, ' ');
                let itemDate = '';
                if (frontMatter.date) {
                    if (frontMatter.date instanceof Date) {
                        itemDate = frontMatter.date.toISOString().split('T')[0];
                    } else if (typeof frontMatter.date === 'string') {
                        const dateMatch = frontMatter.date.match(/^\d{4}-\d{2}-\d{2}/);
                        if (dateMatch) itemDate = dateMatch[0];
                    }
                }
                const authorSlug = this._extractAuthorSlugFromContent(
                    bodyContent,
                    hugoExportRules.author_extraction_regex,
                    hugoExportRules.author_is_list_regex
                );

                let pdfFilename = generateSlug(itemSlug);
                if (authorSlug) pdfFilename += `-${authorSlug}`;
                if (itemDate) pdfFilename += `-${itemDate}`;
                pdfFilename += '.pdf';
                pdfFilename = pdfFilename.replace(/--+/g, '-');

                const outputPdfPath = path.join(itemOutputDir, pdfFilename);

                if (fss.existsSync(outputPdfPath)) {
                    const mdStat = fss.statSync(mdFilePath);
                    const pdfStat = fss.statSync(outputPdfPath);
                    if (mdStat.mtimeMs <= pdfStat.mtimeMs) {
                        console.log(`  Skipping (PDF is up-to-date): ${pdfFilename}`);
                        generatedPdfPaths.push(outputPdfPath);
                        continue;
                    }
                    console.log(`  Re-generating (Markdown is newer): ${pdfFilename}`);
                } else {
                    console.log(`  Generating new PDF: ${pdfFilename}`);
                }

                const cleanedBodyContent = removeShortcodes(bodyContent, allShortcodePatternsToRemove);
                const finalMarkdownToRender = ensureAndPreprocessHeading(
                    cleanedBodyContent,
                    itemTitle,
                    itemBasePluginConfig.aggressiveHeadingCleanup || false
                );
                
                // Merge PDF options: global -> plugin-specific for the item
                const itemPdfOptions = {
                    ...(fullConfig.global_pdf_options || {}),
                    ...(itemBasePluginConfig.pdf_options || {}),
                    margin: {
                        ...((fullConfig.global_pdf_options || {}).margin || {}),
                        ...((itemBasePluginConfig.pdf_options || {}).margin || {}),
                    }
                };

                const htmlBodyContent = renderMarkdownToHtml(
                    finalMarkdownToRender,
                    itemBasePluginConfig.toc_options,
                    itemPdfOptions.anchor_options
                );

                const cssFileContentsArray = [];
                const cssFilesToLoad = itemBasePluginConfig.css_files || [];
                for (const cssFileName of cssFilesToLoad) {
                    if (!itemBasePluginPath) {
                         console.warn(`WARN: itemBasePluginPath not provided to HugoExportEach for base plugin '${itemBasePluginConfig.description || 'unknown'}', cannot load plugin-local CSS file: ${cssFileName}`);
                         continue;
                    }
                    const cssFilePath = path.resolve(itemBasePluginPath, cssFileName);
                    if (fss.existsSync(cssFilePath)) {
                        cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
                    } else {
                        console.warn(`WARN: CSS file for Hugo item (base plugin '${itemBasePluginConfig.description || 'unknown'}') not found: ${cssFilePath}`);
                    }
                }
                if (cssFileContentsArray.length === 0 && cssFilesToLoad.length > 0) {
                     console.warn(`WARN: No CSS files were actually loaded for Hugo item base plugin '${itemBasePluginConfig.description || 'unknown'}', though some were specified: ${cssFilesToLoad.join(', ')}.`);
                }

                await generatePdf(
                    htmlBodyContent,
                    outputPdfPath,
                    itemPdfOptions, // Use the merged PDF options for the item
                    cssFileContentsArray
                );
                generatedPdfPaths.push(outputPdfPath);
                console.log(`  Successfully generated: ${outputPdfPath}`);

            } catch (itemError) {
                console.error(`ERROR processing Hugo item "${mdFilePath}": ${itemError.message}`);
                if (itemError.stack) console.error(itemError.stack);
            }
        }
        console.log(`Hugo PDF export-each complete. ${generatedPdfPaths.length} PDFs processed/checked.`);
        return generatedPdfPaths;
    }
}

module.exports = HugoExportEach;
