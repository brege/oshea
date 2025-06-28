// src/core/markdown_utils.js

/**
 * @fileoverview Provides utility functions for Markdown processing, including
 * configuration loading, front matter extraction, shortcode removal,
 * Markdown-to-HTML rendering, slug generation, heading preprocessing,
 * and placeholder substitution.
 * @version 1.2.4
 * @date 2025-06-08
 */

const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const yaml = require('js-yaml');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const anchorPlugin = require('markdown-it-anchor');
const tocPlugin = 'markdown-it-toc-done-right';
const createMathIntegration = require('./math_integration');
const mathIntegration = createMathIntegration();


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
        console.warn(`WARN: No CSS files defined for document type '${docType}' or for 'default' type. Consider adding 'default.css' or type-specific CSS.`);
        cssFiles = ['default.css']; // Fallback to a conventional default name
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
        math: typeSettings.math || { enabled: false },
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
        // Sort patterns by length, descending, to match more specific patterns (like blocks) first.
        const sortedPatterns = [...patterns].sort((a, b) => b.length - a.length);

        sortedPatterns.forEach((patternStr, index) => {
            if (typeof patternStr !== 'string' || patternStr.trim() === '') return;
            try {
                let regex;
                if (patternStr.includes('([\\s\\S]*?)')) { // Assuming this indicates a block pattern
                    // Use the pattern directly, ensuring it's global and multiline
                    regex = new RegExp(patternStr, 'gs'); // 's' for dotall, 'g' for global
                } else {
                    // For inline or single-line patterns
                    regex = new RegExp(patternStr, 'g'); // 'g' for global
                }

                processedContent = processedContent.replace(regex, '');

            } catch (e) {
                console.warn(`WARN: Invalid regex pattern for shortcode removal: '${patternStr}'. Skipping. Error: ${e.message}`);
            }
        });
    }
    return processedContent;
}

/**
 * Renders a Markdown string to an HTML string using markdown-it with plugins.
 *
 * @param {string} markdownContent - The Markdown content to render.
 * @param {Object} [tocOptions={enabled: false}] - Configuration for the Table of Contents plugin.
 * @param {Object} [anchorOptions={}] - Configuration for the anchor plugin (markdown-it-anchor).
 * @param {Object} [mathConfig=null] - Configuration for math rendering.
 * @param {MarkdownIt} [mdInstance] - Optional. A pre-configured instance of MarkdownIt.
 * @param {Object} [markdownItOptions={}] - Optional. Additional options for the MarkdownIt instance.
 * @param {Array} [customPlugins=[]] - Optional. An array of custom markdown-it plugins to use.
 * @returns {string} The rendered HTML string (body content).
 */
function renderMarkdownToHtml(markdownContent, tocOptions = { enabled: false }, anchorOptions = {}, mathConfig = null, mdInstance, markdownItOptions = {}, customPlugins = []) {
    const baseOptions = {
        html: true,
        xhtmlOut: false,
        breaks: false,
        langPrefix: 'language-',
        linkify: true,
        typographer: true,
    };

    const finalOptions = {
        ...baseOptions,
        ...markdownItOptions
    };

    const md = mdInstance || new MarkdownIt(finalOptions);

    if (Array.isArray(customPlugins)) {
        customPlugins.forEach(pluginConfig => {
            try {
                if (Array.isArray(pluginConfig)) {
                    const [pluginName, pluginOptions] = pluginConfig;
                    md.use(require(pluginName), pluginOptions || {});
                } else if (typeof pluginConfig === 'string') {
                    md.use(require(pluginConfig));
                } else {
                    console.warn(`Invalid markdown-it plugin configuration found:`, pluginConfig);
                }
            } catch (e) {
                console.error(`Error applying custom markdown-it plugin '${pluginConfig}': ${e.message}`);
            }
        });
    }

    md.use(anchorPlugin, {
        level: anchorOptions?.level || [1, 2, 3, 4, 5, 6],
        permalink: anchorOptions?.permalink || false,
    });

    if (tocOptions && tocOptions.enabled) {
        md.use(require(tocPlugin), {
            placeholder: tocOptions.placeholder || '%toc%',
            level: tocOptions.level || [1, 2, 3],
            listType: tocOptions.listType || 'ol',
        });
    }

    if (mathConfig && mathConfig.enabled) {
        mathIntegration.configureMarkdownItForMath(md, mathConfig);
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

// --- Placeholder Substitution Functions ---

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
            // For the first key, try a case-insensitive match (common for front matter)
            actualKeyInCurrentObject = Object.keys(current).find(k => k.toLowerCase() === keySegment.toLowerCase());
            if (actualKeyInCurrentObject === undefined) return undefined;
        } else {
            // For subsequent keys, be case-sensitive (for nested object properties)
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
 * Replaces placeholders in a content string using a given context.
 * @param {string} content - The string containing placeholders (e.g., "{{ .myKey }}").
 * @param {Object} context - The data object to resolve placeholders against.
 * @param {string} [warningContext="value"] - A string to add context to warning messages.
 * @returns {{changed: boolean, newContent: string}} - An object indicating if changes were made and the new content string.
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
        // Only warn if the placeholder wasn't an empty string (which could be an intentional removal)
        if (match.trim() !== '{{}}' && match.trim() !== '{{ . }}') {
            console.warn(`WARN: Placeholder '{{ ${fullPath} }}' not found during ${warningContext} substitution.`);
        }
        return match; // Return original match if placeholder not found
    });
    return { changed, newContent };
}

/**
 * Iteratively replaces placeholders in context data (like front matter) and then in the main content.
 * It first resolves placeholders within the context data itself (e.g., a front matter key referencing another),
 * then uses this fully resolved context to substitute placeholders in the main Markdown content.
 * Also adds dynamic date placeholders to the context.
 *
 * @param {string} mainContent - The main Markdown content (after initial front matter extraction).
 * @param {Object} initialContextData - The initial data context, typically a merge of global `params` and
 * document-specific front matter. Front matter should take precedence.
 * @returns {{processedFmData: Object, processedContent: string}} An object containing:
 * `processedFmData`: The context data after all internal substitutions and addition of date placeholders.
 * `processedContent`: The main content string with all placeholders substituted.
 */
function substituteAllPlaceholders(mainContent, initialContextData) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isoDate = today.toISOString().split('T')[0];

    // Start with the provided initial context (already merged global params + front matter)
    // and add dynamic date placeholders.
    let processingContext = {
        ...initialContextData,
        CurrentDateFormatted: formattedDate,
        CurrentDateISO: isoDate,
    };

    let fmChangedInLoop = true;
    const maxFmSubstLoops = 5; // Safety break for circular dependencies in context
    let loopCount = 0;

    // Iteratively substitute placeholders within the context data itself
    while (fmChangedInLoop && loopCount < maxFmSubstLoops) {
        fmChangedInLoop = false;
        loopCount++;
        const nextContextIteration = { ...processingContext };
        for (const key in processingContext) {
            if (Object.prototype.hasOwnProperty.call(processingContext, key) && typeof processingContext[key] === 'string') {
                const substitutionResult = substitutePlaceholdersInString(
                    processingContext[key],
                    processingContext, // Use the current state of context for resolving
                    `context key '${key}' (loop ${loopCount})`
                );
                if (substitutionResult.changed) {
                    fmChangedInLoop = true;
                }
                nextContextIteration[key] = substitutionResult.newContent;
            }
        }
        processingContext = nextContextIteration; // Update context for the next loop or for final use
    }

    if (loopCount === maxFmSubstLoops && fmChangedInLoop) {
        console.warn("WARN: Max substitution loops reached for context data. Check for circular placeholder references.");
    }

    // Substitute placeholders in the main Markdown content using the fully processed context
    const { newContent: processedMainContent } = substitutePlaceholdersInString(mainContent, processingContext, "main content");

    return { processedFmData: processingContext, processedContent: processedMainContent };
}


module.exports = {
    loadConfig,
    getTypeConfig,
    extractFrontMatter,
    removeShortcodes,
    renderMarkdownToHtml,
    generateSlug,
    ensureAndPreprocessHeading,
    substituteAllPlaceholders // Added for export
};
