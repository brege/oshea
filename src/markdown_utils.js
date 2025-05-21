// src/markdown_utils.js

/**
 * @fileoverview Provides utility functions for Markdown processing, including
 * configuration loading, front matter extraction, shortcode removal,
 * Markdown-to-HTML rendering, slug generation, and heading preprocessing.
 * @version 1.2.1 // Updated version for Step 0 refactor
 * @date 2025-05-21 // Updated date
 */

const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const yaml = require('js-yaml');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const anchorPlugin = require('markdown-it-anchor');
const tocPlugin = require('markdown-it-toc-done-right');
// const katexPlugin = require('@vscode/markdown-it-katex'); // Removed for Step 0
const mathIntegration = require('./math_integration'); // Added for Step 0

/**
 * Loads and parses a YAML configuration file.
 *
 * @async
 * @param {string} configPath - Absolute path to the YAML configuration file.
 * @returns {Promise<Object>} The parsed configuration object.
 * @throws {Error} If the file is not found, is empty, or cannot be parsed.
 */
async function loadConfig(configPath) {
    if (!fss.existsSync(configPath)) {
        throw new Error(`Configuration file '${configPath}' not found.`);
    }
    try {
        const fileContents = await fs.readFile(configPath, 'utf8');
        const config = yaml.load(fileContents);
        if (!config) { // Handles empty or effectively null config after parsing
            throw new Error(`Configuration file '${configPath}' is empty or invalid.`);
        }
        return config;
    } catch (error) {
        // Catch errors from readFile or yaml.load
        throw new Error(`Error loading or parsing '${configPath}': ${error.message}`);
    }
}

/**
 * Resolves the specific configuration for a given document type.
 * Merges global PDF options with type-specific overrides and determines
 * CSS files, TOC settings, cover page details, and shortcode removal patterns.
 *
 * @param {Object} fullConfig - The entire configuration object from config.yaml.
 * @param {string} docType - The document type (e.g., 'cv', 'recipe', 'default').
 * @returns {Object} The resolved configuration for the document type.
 * @throws {Error} If no configuration is found for the specified docType or for 'default'.
 */
function getTypeConfig(fullConfig, docType) {
    const typeSettings = fullConfig.document_types?.[docType] || fullConfig.document_types?.default;
    if (!typeSettings) {
        throw new Error(`No configuration found for document type '${docType}' or for 'default'. Missing 'document_types.${docType}' or 'document_types.default' in config.yaml.`);
    }

    const globalPdfOptions = fullConfig.global_pdf_options || {};
    const typeSpecificPdfOptions = typeSettings.pdf_options || {};

    const mergedMargins = {
        ...(globalPdfOptions.margin || {}),
        ...(typeSpecificPdfOptions.margin || {}),
    };

    const resolvedPdfOptions = {
        ...globalPdfOptions,
        ...typeSpecificPdfOptions,
        margin: mergedMargins,
    };

    let cssFiles = typeSettings.css_files;
    if (!Array.isArray(cssFiles) || cssFiles.length === 0) {
        cssFiles = fullConfig.document_types?.default?.css_files || [];
    }
    if (!Array.isArray(cssFiles) || cssFiles.length === 0) {
        console.warn(`WARN: No CSS files defined for document type '${docType}' or for 'default' type. Consider adding 'css/default.css' or type-specific CSS.`);
        cssFiles = ['default.css'];
    }

    let resolvedShortcodePatterns = typeSettings.remove_shortcodes_patterns;
    if (!Array.isArray(resolvedShortcodePatterns) || resolvedShortcodePatterns.length === 0) {
        resolvedShortcodePatterns = fullConfig.global_remove_shortcodes || [];
    }

    return {
        description: typeSettings.description || 'N/A',
        css_files: cssFiles,
        pdf_options: resolvedPdfOptions,
        toc_options: typeSettings.toc_options || { enabled: false },
        // math_rendering options are now fully resolved by ConfigResolver and passed separately.
        cover_page: typeSettings.cover_page || { enabled: false },
        remove_shortcodes_patterns: resolvedShortcodePatterns,
        hugo_specific_options: typeSettings.hugo_specific_options || {},
        pdf_viewer: fullConfig.pdf_viewer || null,
        aggressiveHeadingCleanup: typeSettings.aggressiveHeadingCleanup || false,
        inject_fm_title_as_h1: typeSettings.inject_fm_title_as_h1 || false,
    };
}

/**
 * Extracts front matter and main content from a Markdown string.
 *
 * @param {string} markdownContent - The Markdown content string.
 * @returns {{data: Object, content: string}} An object with `data` (the parsed front matter object)
 * and `content` (the Markdown string without front matter). Returns an empty data object
 * and the original content if no front matter is found or if parsing fails.
 */
function extractFrontMatter(markdownContent) {
    try {
        const result = matter(markdownContent);
        return { data: result.data || {}, content: result.content || markdownContent };
    } catch (e) {
        console.warn(`WARN: Could not parse front matter: ${e.message}. Proceeding with full content as body.`);
        return { data: {}, content: markdownContent };
    }
}

/**
 * Removes content matching an array of regex patterns from a string.
 *
 * @param {string} content - The input string.
 * @param {Array<string>} patterns - An array of regular expression patterns (as strings).
 * @returns {string} The content with matched patterns removed.
 */
function removeShortcodes(content, patterns) {
    let processedContent = content;
    if (patterns && Array.isArray(patterns)) {
        patterns.forEach(patternStr => {
            if (typeof patternStr !== 'string' || patternStr.trim() === '') return;
            try {
                const regex = new RegExp(patternStr, 'gs');
                processedContent = processedContent.replace(regex, '');
            } catch (e) {
                console.warn(`WARN: Invalid regex pattern for shortcode removal: '${patternStr}'. Skipping. Error: ${e.message}`);
            }
        });
    }
    return processedContent;
}

/**
 * Renders a Markdown string to an HTML string using markdown-it with anchor, TOC, and potentially math plugins.
 *
 * @param {string} markdownContent - The Markdown content to render.
 * @param {Object} [tocOptions={enabled: false}] - Configuration for the Table of Contents plugin.
 * @param {Object} [anchorOptions={}] - Configuration for the anchor plugin (markdown-it-anchor).
 * @param {Object} [mathRenderingOptions=null] - Configuration for math rendering.
 * @param {MarkdownIt} [mdInstance] - Optional. A pre-configured instance of MarkdownIt. If not provided, a new one is created.
 * @returns {string} The rendered HTML string (body content).
 */
function renderMarkdownToHtml(markdownContent, tocOptions = { enabled: false }, anchorOptions = {}, mathRenderingOptions = null, mdInstance) {
    const md = mdInstance || new MarkdownIt({
        html: true,
        xhtmlOut: false,
        breaks: false,
        langPrefix: 'language-',
        linkify: true,
        typographer: true,
    });

    md.use(anchorPlugin, {
        level: anchorOptions?.level || [1, 2, 3, 4, 5, 6],
        permalink: anchorOptions?.permalink || false,
    });

    if (tocOptions && tocOptions.enabled) {
        md.use(tocPlugin, {
            placeholder: tocOptions.placeholder || '%toc%',
            level: tocOptions.level || [1, 2, 3],
            listType: tocOptions.listType || 'ol',
        });
    }

    // Call the math integration module to configure the md instance
    if (mathRenderingOptions && mathRenderingOptions.enabled) {
        mathIntegration.configureMarkdownItForMath(md, mathRenderingOptions);
    }

    return md.render(markdownContent);
}

/**
 * Generates a URL-friendly slug from a given string.
 *
 * @param {string} text - The text to be slugified.
 * @returns {string} The generated slug. Returns an empty string if input is invalid.
 */
function generateSlug(text) {
    if (typeof text !== 'string' || text.trim() === '') {
        return '';
    }
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Ensures Markdown content starts with an H1 heading.
 *
 * @param {string} markdownContent - The original Markdown content.
 * @param {string} [title] - Optional title to be used as the H1 heading.
 * @param {boolean} [aggressiveCleanup=false] - If true, enables more aggressive removal of existing H1/H2 headings.
 * @returns {string} The processed Markdown content.
 */
function ensureAndPreprocessHeading(markdownContent, title, aggressiveCleanup = false) {
    let processedContent = markdownContent.trim();

    if (title && typeof title === 'string' && title.trim() !== '') {
        const newH1 = `# ${title.trim()}\n\n`;
        if (aggressiveCleanup) {
            processedContent = processedContent.replace(/^#\s+.*(\r?\n|$)/m, '').trim();
            processedContent = processedContent.replace(/^##\s+.*(\r?\n|$)/m, '').trim();
        }
        if (!processedContent.startsWith(newH1.trim())) {
             return `${newH1}${processedContent}`;
        }
        return processedContent;
    } else {
        if (!processedContent.match(/^#\s+/m) && !aggressiveCleanup) {
            console.warn("WARN: Markdown content does not start with an H1 heading, and no title was provided to prepend.");
        }
        return processedContent;
    }
}

module.exports = {
    loadConfig,
    getTypeConfig,
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    generateSlug,
    ensureAndPreprocessHeading,
};
