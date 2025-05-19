// src/markdown_utils.js

/**
 * @fileoverview Provides utility functions for Markdown processing, including
 * configuration loading, front matter extraction, shortcode removal,
 * Markdown-to-HTML rendering, slug generation, and heading preprocessing.
 * @version 1.1.0 // Updated version to reflect comment changes
 * @date 2025-05-18
 */

const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const yaml = require('js-yaml');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const anchorPlugin = require('markdown-it-anchor');
const tocPlugin = require('markdown-it-toc-done-right');

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
 * @returns {Object} The resolved configuration for the document type, including:
 * - {string} description
 * - {Array<string>} css_files
 * - {Object} pdf_options (merged global and type-specific)
 * - {Object} toc_options
 * - {Object} cover_page (relevant for recipe-book)
 * - {Array<string>} remove_shortcodes_patterns (type-specific takes precedence)
 * - {Object} hugo_specific_options
 * - {string|null} pdf_viewer
 * @throws {Error} If no configuration is found for the specified docType or for 'default'.
 */
function getTypeConfig(fullConfig, docType) {
    const typeSettings = fullConfig.document_types?.[docType] || fullConfig.document_types?.default;
    if (!typeSettings) {
        throw new Error(`No configuration found for document type '${docType}' or for 'default'. Missing 'document_types.${docType}' or 'document_types.default' in config.yaml.`);
    }

    const globalPdfOptions = fullConfig.global_pdf_options || {};
    const typeSpecificPdfOptions = typeSettings.pdf_options || {};

    // Deep merge for margins: type-specific values override global ones.
    const mergedMargins = {
        ...(globalPdfOptions.margin || {}),
        ...(typeSpecificPdfOptions.margin || {}),
    };

    const resolvedPdfOptions = {
        ...globalPdfOptions,
        ...typeSpecificPdfOptions, // Type-specific options take precedence over global ones.
        margin: mergedMargins,    // Apply the carefully merged margins.
    };

    // Resolve CSS files: type-specific list, then default type's list, then an empty array.
    let cssFiles = typeSettings.css_files;
    if (!Array.isArray(cssFiles) || cssFiles.length === 0) {
        cssFiles = fullConfig.document_types?.default?.css_files || [];
    }
    // Ensure cssFiles is always an array; if still empty, warn and use a placeholder.
    if (!Array.isArray(cssFiles) || cssFiles.length === 0) {
        console.warn(`WARN: No CSS files defined for document type '${docType}' or for 'default' type. Consider adding 'css/default.css' or type-specific CSS.`);
        cssFiles = ['default.css']; // Fallback to ensure it's an array; pdf_generator will warn if file doesn't exist.
    }

    // Resolve shortcode patterns: type-specific patterns take precedence over global ones.
    let resolvedShortcodePatterns = typeSettings.remove_shortcodes_patterns;
    if (!Array.isArray(resolvedShortcodePatterns) || resolvedShortcodePatterns.length === 0) {
        resolvedShortcodePatterns = fullConfig.global_remove_shortcodes || [];
    }


    return {
        description: typeSettings.description || 'N/A',
        css_files: cssFiles,
        pdf_options: resolvedPdfOptions,
        toc_options: typeSettings.toc_options || { enabled: false },
        cover_page: typeSettings.cover_page || { enabled: false }, // Primarily for 'recipe-book' type
        remove_shortcodes_patterns: resolvedShortcodePatterns,
        hugo_specific_options: typeSettings.hugo_specific_options || {}, // For Hugo-specific configurations
        pdf_viewer: fullConfig.pdf_viewer || null, // Global PDF viewer command
        // Include any type-specific flags like aggressiveHeadingCleanup or inject_fm_title_as_h1
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
                // 'g' for global match, 's' (dotAll) for '.' to match newline characters.
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
 * Renders a Markdown string to an HTML string using markdown-it with anchor and TOC plugins.
 *
 * @param {string} markdownContent - The Markdown content to render.
 * @param {Object} [tocOptions={enabled: false}] - Configuration for the Table of Contents plugin.
 * Expected properties: enabled (boolean), placeholder (string), level (Array<number>), listType (string).
 * @param {Object} [anchorOptions] - Configuration for the anchor plugin (markdown-it-anchor).
 * Expected properties: level (Array<number>), permalink (boolean).
 * @param {MarkdownIt} [mdInstance] - Optional. A pre-configured instance of MarkdownIt. If not provided, a new one is created.
 * @returns {string} The rendered HTML string (body content).
 */
function renderMarkdownToHtml(markdownContent, tocOptions = { enabled: false }, anchorOptions = {}, mdInstance) {
    const md = mdInstance || new MarkdownIt({
        html: true,        // Enable HTML tags in source.
        xhtmlOut: false,   // Don't output XHTML.
        breaks: false,     // Convert '\n' in paragraphs into <br>. Set to true for GFM-like breaks.
        langPrefix: 'language-', // CSS language prefix for fenced code blocks.
        linkify: true,     // Autoconvert URL-like text to links.
        typographer: true, // Enable some language-neutral replacement + quotes beautification.
    });

    // Configure and use markdown-it-anchor plugin. Must be applied before TOC plugin.
    md.use(anchorPlugin, {
        level: anchorOptions?.level || [1, 2, 3, 4, 5, 6], // Levels to add IDs to.
        permalink: anchorOptions?.permalink || false,      // Whether to add permalink symbols.
        // slugify: s => customSlugifyFunction(s) // Optional: custom slug function.
    });

    // Configure and use markdown-it-toc-done-right plugin if enabled.
    if (tocOptions && tocOptions.enabled) {
        md.use(tocPlugin, {
            placeholder: tocOptions.placeholder || '%toc%', // Placeholder string in Markdown for TOC.
            level: tocOptions.level || [1, 2, 3],      // Heading levels to include in TOC.
            listType: tocOptions.listType || 'ol',     // Type of list for TOC ('ul' or 'ol').
            // slugify: s => customSlugifyFunction(s) // Optional: must match anchor's slugify.
        });
    }

    return md.render(markdownContent);
}

/**
 * Generates a URL-friendly slug from a given string.
 * Converts to lowercase, replaces spaces and multiple hyphens with a single hyphen,
 * and removes non-alphanumeric characters except for hyphens.
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
        .replace(/\s+/g, '-')           // Replace spaces with hyphens.
        .replace(/[^\w-]+/g, '')       // Remove all non-word characters (except hyphens and underscores).
        .replace(/--+/g, '-')         // Replace multiple hyphens with a single hyphen.
        .replace(/^-+/, '')             // Trim hyphens from the start.
        .replace(/-+$/, '');            // Trim hyphens from the end.
}

/**
 * Ensures Markdown content starts with an H1 heading.
 * If a title is provided, it's prepended as H1.
 * If `aggressiveCleanup` is true (e.g., for recipe book items),
 * it attempts to remove existing H1/H2 headings from the content before prepending the new title
 * to prevent duplication.
 *
 * @param {string} markdownContent - The original Markdown content.
 * @param {string} [title] - Optional title to be used as the H1 heading.
 * @param {boolean} [aggressiveCleanup=false] - If true, enables more aggressive removal of existing H1/H2 headings.
 * @returns {string} The processed Markdown content, potentially with a new H1 heading.
 */
function ensureAndPreprocessHeading(markdownContent, title, aggressiveCleanup = false) {
    let processedContent = markdownContent.trim();

    if (title && typeof title === 'string' && title.trim() !== '') {
        const newH1 = `# ${title.trim()}\n\n`;
        if (aggressiveCleanup) {
            // Remove any existing H1 (e.g., # Existing Title)
            processedContent = processedContent.replace(/^#\s+.*(\r?\n|$)/m, '').trim();
            // Remove any existing H2 (e.g., ## Existing SubTitle)
            // This is a simple regex; might need refinement for complex H2s with attributes.
            processedContent = processedContent.replace(/^##\s+.*(\r?\n|$)/m, '').trim();
        }
        // Prepend the new H1 only if the content doesn't already start with this exact H1
        // to avoid double-prepending if called multiple times with the same title.
        if (!processedContent.startsWith(newH1.trim())) {
             return `${newH1}${processedContent}`;
        }
        return processedContent; // Already starts with the desired H1 or was cleaned
    } else {
        // If no explicit title is given, check if content already starts with any H1.
        if (!processedContent.match(/^#\s+/m) && !aggressiveCleanup) {
             // Only warn if not in aggressive cleanup mode (where we might remove an existing title anyway)
            console.warn("WARN: Markdown content does not start with an H1 heading, and no title was provided to prepend.");
        }
        return processedContent; // Return trimmed original if no title to prepend or no H1 found
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
