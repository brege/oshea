// plugins/recipe-book/index.js
const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const path = require('path');

const {
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    ensureAndPreprocessHeading,
} = require(path.resolve(__dirname, '../../src/markdown_utils'));

const { generatePdf } = require(path.resolve(__dirname, '../../src/pdf_generator'));

class RecipeBookHandler {
    /**
     * Builds a recipe book PDF.
     * @param {Object} data - Expected to contain `cliArgs.recipesBaseDir` when invoked via 'generate' command.
     * @param {Object} pluginSpecificConfig - Configuration from plugins/recipe-book/recipe-book.config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt = "recipe-book.pdf"] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin (plugins/recipe-book/).
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt = "recipe-book.pdf", pluginBasePath) {
        const recipesBaseDir = data.cliArgs && data.cliArgs.recipesBaseDir;

        if (!recipesBaseDir) {
            throw new Error("The 'recipesBaseDir' option was not provided for the recipe-book plugin. Use --recipes-base-dir <path> with the 'generate' command.");
        }
        if (!fss.existsSync(recipesBaseDir)) {
            throw new Error(`Recipe source directory not found: ${recipesBaseDir}`);
        }
        
        await fs.mkdir(outputDir, { recursive: true });

        const outputPdfFilename = outputFilenameOpt || pluginSpecificConfig.default_filename || "recipe-book.pdf";
        const outputPdfPath = path.join(outputDir, outputPdfFilename);
        
        let combinedMarkdown = "";
        const collectedRecipeDetails = [];

        const dirents = await fs.readdir(recipesBaseDir, { withFileTypes: true });
        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                const recipeFolderPath = path.join(recipesBaseDir, dirent.name);
                const potentialIndexFile = path.join(recipeFolderPath, 'index.md');
                if (fss.existsSync(potentialIndexFile)) {
                    collectedRecipeDetails.push({
                        filePath: potentialIndexFile,
                        slug: dirent.name,
                    });
                }
            }
        }
        collectedRecipeDetails.sort((a, b) => a.slug.localeCompare(b.slug));
        if (collectedRecipeDetails.length === 0) {
            console.warn(`WARN: No recipe files (index.md in subdirectories) found in ${recipesBaseDir}. The book might be empty or only contain a cover/ToC.`);
        }

        if (pluginSpecificConfig.cover_page && pluginSpecificConfig.cover_page.enabled) {
            const { title = "Recipe Book", subtitle = "", author = "" } = pluginSpecificConfig.cover_page;
            combinedMarkdown += `<div class="cover-page-content">\n`;
            if (title) combinedMarkdown += `  <h1 class="cover-title">${title}</h1>\n`;
            if (subtitle) combinedMarkdown += `  <p class="cover-subtitle">${subtitle}</p>\n`;
            if (author) combinedMarkdown += `  <p class="cover-author">${author}</p>\n`;
            combinedMarkdown += `</div>\n`;
            combinedMarkdown += `<div style="page-break-after: always;"></div>\n\n`;
        }

        if (pluginSpecificConfig.toc_options && pluginSpecificConfig.toc_options.enabled && pluginSpecificConfig.toc_options.placeholder) {
            combinedMarkdown += `${pluginSpecificConfig.toc_options.placeholder}\n\n`;
            combinedMarkdown += `<div style="page-break-after: always;"></div>\n\n`;
        }

        for (const recipeDetail of collectedRecipeDetails) {
            console.log(`  Adding to book: ${recipeDetail.filePath}`);
            const rawRecipeContent = await fs.readFile(recipeDetail.filePath, 'utf8');
            const { data: frontMatter, content: contentWithoutFm } = extractFrontMatter(rawRecipeContent);
            
            const patternsToRemove = [
                ...(globalConfig.global_remove_shortcodes || []), 
                ...(pluginSpecificConfig.remove_shortcodes_patterns || []) 
            ];
            const cleanedContent = removeShortcodes(contentWithoutFm, patternsToRemove);

            const recipeTitle = frontMatter.title || recipeDetail.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const processedRecipeMarkdown = ensureAndPreprocessHeading(
                cleanedContent,
                recipeTitle,
                true 
            );
            combinedMarkdown += processedRecipeMarkdown;
            combinedMarkdown += "\n\n<div style=\"page-break-before: always;\"></div>\n\n";
        }
        
        const bookPdfOptions = {
            ...(globalConfig.global_pdf_options || {}),
            ...(pluginSpecificConfig.pdf_options || {}),
            margin: {
                ...((globalConfig.global_pdf_options || {}).margin || {}),
                ...((pluginSpecificConfig.pdf_options || {}).margin || {}),
            }
        };

        const htmlBodyContent = renderMarkdownToHtml(
            combinedMarkdown,
            pluginSpecificConfig.toc_options,
            bookPdfOptions.anchor_options
        );

        const cssFileContentsArray = [];
        const cssFilesToLoad = pluginSpecificConfig.css_files || [];
        for (const cssFileName of cssFilesToLoad) {
            const cssFilePath = path.resolve(pluginBasePath, cssFileName);
            if (fss.existsSync(cssFilePath)) {
                cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
            } else {
                console.warn(`WARN: CSS file for recipe book plugin not found: ${cssFilePath}`);
            }
        }
        if (cssFileContentsArray.length === 0 && cssFilesToLoad.length > 0) {
            console.warn(`WARN: No CSS files were actually loaded for recipe book plugin, though some were specified: ${cssFilesToLoad.join(', ')}.`);
        }

        await generatePdf(
            htmlBodyContent,
            outputPdfPath,
            bookPdfOptions,
            cssFileContentsArray
        );

        return outputPdfPath;
    }
}

module.exports = RecipeBookHandler;
