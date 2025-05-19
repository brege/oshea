// src/recipe_book_builder.js

/**
 * @fileoverview Defines the RecipeBookBuilder class, responsible for assembling a
 * recipe book PDF from a collection of individual recipe Markdown files. This includes
 * discovering recipe files, preprocessing each recipe (e.g., standardizing headings),
 * optionally adding a cover page and table of contents, concatenating content,
 * and finally rendering the combined document to a PDF.
 * @version 1.1.0 // Version bump for comment refinement
 * @date 2025-05-18
 */

const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const path = require('path');

const {
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    ensureAndPreprocessHeading,
    // generateSlug is not directly used here but by other processors or if title fallback needed it.
} = require('./markdown_utils');

const { generatePdf } = require('./pdf_generator'); // Corrected import name

class RecipeBookBuilder {
    /**
     * Constructs a recipe book PDF by discovering, processing, and concatenating
     * multiple recipe Markdown files from a specified directory.
     *
     * @async
     * @param {string} recipesBaseDir - Absolute path to the directory containing recipe Markdown files,
     * typically structured with each recipe in its own subdirectory containing an `index.md`.
     * @param {Object} recipeBookConfig - The resolved configuration for the 'recipe-book' document type.
     * Expected to contain:
     * - `css_files` (Array<string>): List of CSS filenames for styling.
     * - `pdf_options` (Object): Puppeteer PDF options for the entire book.
     * - `toc_options` (Object): Configuration for the table of contents (e.g., enabled, placeholder, level).
     * - `cover_page` (Object): Configuration for the cover page (e.g., enabled, title, subtitle, author).
     * - `remove_shortcodes_patterns` (Array<string>): Regex patterns for shortcodes to remove from each recipe item.
     * @param {string} outputDir - Absolute path to the output directory for the generated book PDF.
     * @param {string} outputFilename - The desired filename for the recipe book PDF (e.g., "my-cookbook.pdf").
     * @returns {Promise<string>} The absolute path to the generated recipe book PDF.
     * @throws {Error} If the recipe source directory is not found or if any part of the PDF building process fails.
     */
    async build(recipesBaseDir, recipeBookConfig, outputDir, outputFilename) {
        if (!fss.existsSync(recipesBaseDir)) {
            throw new Error(`Recipe source directory not found: ${recipesBaseDir}`);
        }
        await fs.mkdir(outputDir, { recursive: true });

        const outputPdfPath = path.join(outputDir, outputFilename);
        let combinedMarkdown = "";
        const collectedRecipeDetails = []; // Stores details for sorting and processing.

        // --- 1. Discover Recipe Files ---
        // Assumes a Hugo-like structure: subdirectories with an index.md file represent recipes.
        const dirents = await fs.readdir(recipesBaseDir, { withFileTypes: true });
        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                const recipeFolderPath = path.join(recipesBaseDir, dirent.name);
                const potentialIndexFile = path.join(recipeFolderPath, 'index.md');
                if (fss.existsSync(potentialIndexFile)) {
                    collectedRecipeDetails.push({
                        filePath: potentialIndexFile,
                        slug: dirent.name, // Directory name is used as a slug for sorting.
                    });
                }
            }
            // Consider adding logic here to also pick up .md files directly in recipesBaseDir if desired.
        }

        // Sort recipes by slug (directory name) to ensure a consistent order in the book.
        collectedRecipeDetails.sort((a, b) => a.slug.localeCompare(b.slug));

        if (collectedRecipeDetails.length === 0) {
            console.warn(`WARN: No recipe files (index.md in subdirectories) found in ${recipesBaseDir}. The book might be empty or only contain a cover/ToC.`);
        }

        // --- 2. Prepend Cover Page HTML (if configured) ---
        if (recipeBookConfig.cover_page && recipeBookConfig.cover_page.enabled) {
            const { title = "Recipe Book", subtitle = "", author = "" } = recipeBookConfig.cover_page;
            combinedMarkdown += `<div class="cover-page-content">\n`;
            if (title) combinedMarkdown += `  <h1 class="cover-title">${title}</h1>\n`;
            if (subtitle) combinedMarkdown += `  <p class="cover-subtitle">${subtitle}</p>\n`;
            if (author) combinedMarkdown += `  <p class="cover-author">${author}</p>\n`;
            combinedMarkdown += `</div>\n`;
            // Ensure a page break after the cover. CSS (recipe-book.css) should style .cover-page-content
            // with `page-break-after: always;` or a manual break like this can be used.
            combinedMarkdown += `<div style="page-break-after: always;"></div>\n\n`;
        }

        // --- 3. Prepend Table of Contents Placeholder (if configured) ---
        if (recipeBookConfig.toc_options && recipeBookConfig.toc_options.enabled && recipeBookConfig.toc_options.placeholder) {
            combinedMarkdown += `${recipeBookConfig.toc_options.placeholder}\n\n`;
            // Ensure a page break after the ToC. CSS (recipe-book.css) should handle this,
            // for example, by styling the ToC container class with `page-break-after: always;`.
            // A manual break is added here as a fallback.
            combinedMarkdown += `<div style="page-break-after: always;"></div>\n\n`;
        }

        // --- 4. Process and Concatenate Each Recipe ---
        for (const recipeDetail of collectedRecipeDetails) {
            console.log(`  Adding to book: ${recipeDetail.filePath}`);
            const rawRecipeContent = await fs.readFile(recipeDetail.filePath, 'utf8');
            const { data: frontMatter, content: contentWithoutFm } = extractFrontMatter(rawRecipeContent);

            // Remove shortcodes from individual recipe content using patterns from recipeBookConfig.
            const cleanedContent = removeShortcodes(
                contentWithoutFm,
                recipeBookConfig.remove_shortcodes_patterns
            );

            // Determine title for H1: from front matter 'title', fallback to a formatted slug.
            const recipeTitle = frontMatter.title ||
                                recipeDetail.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Ensure each recipe starts with an H1 and clean up potential duplicate titles from content.
            // The `isRecipeBookItem = true` enables more aggressive heading cleanup.
            const processedRecipeMarkdown = ensureAndPreprocessHeading(
                cleanedContent,
                recipeTitle,
                true // isRecipeBookItem = true
            );

            combinedMarkdown += processedRecipeMarkdown;
            // Insert a hard page break before the next recipe starts.
            // This ensures each recipe begins on a new page.
            combinedMarkdown += "\n\n<div style=\"page-break-before: always;\"></div>\n\n";
        }

        // For debugging the combined markdown before PDF conversion:
        // const debugCombinedMdPath = outputPdfPath.replace(/\.pdf$/, '_book_combined.md');
        // await fs.writeFile(debugCombinedMdPath, combinedMarkdown, 'utf8');
        // console.log(`DEBUG: Combined Markdown for book saved to: ${debugCombinedMdPath}`);

        // --- 5. Render Combined Markdown to HTML ---
        const htmlBodyContent = renderMarkdownToHtml(
            combinedMarkdown,
            recipeBookConfig.toc_options,      // Master ToC options for the whole book.
            recipeBookConfig.pdf_options?.anchor_options // Anchor options for the whole book.
        );

        // --- 6. Load CSS File Contents for the Book ---
        const cssFileContentsArray = [];
        // Assume css directory is relative to the main script's location (project root).
        const cssDir = path.join(path.dirname(require.main.filename || process.cwd()), 'css');
        for (const cssFileName of recipeBookConfig.css_files) {
            const cssFilePath = path.join(cssDir, cssFileName);
            if (fss.existsSync(cssFilePath)) {
                cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
            } else {
                console.warn(`WARN: CSS file for recipe book not found: ${cssFilePath}`);
            }
        }

        // --- 7. Generate the Final PDF for the Book ---
        await generatePdf(
            htmlBodyContent,
            outputPdfPath,
            recipeBookConfig.pdf_options,
            cssFileContentsArray
        );

        return outputPdfPath;
    }
}

module.exports = RecipeBookBuilder;
