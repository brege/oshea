// src/core/markdown_utils.js
const { mathIntegrationPath, loggerPath  } = require('@paths');
const logger = require(loggerPath);



const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const yaml = require('js-yaml');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const anchorPlugin = require('markdown-it-anchor');
const tocPlugin = 'markdown-it-toc-done-right';
const createMathIntegration = require(mathIntegrationPath);
const mathIntegration = createMathIntegration();



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
    logger.warn(`No CSS files defined for document type '${docType}' or for 'default' type. Consider adding 'default.css' or type-specific CSS.`, { module: 'src/core/markdown_utils.js' });
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


function extractFrontMatter(markdownContent) {
  try {
    const result = matter(markdownContent);
    return { data: result.data || {}, content: result.content || markdownContent };
  } catch (e) {
    logger.warn(`Could not parse front matter: ${e.message}. Proceeding with full content as body.`, { module: 'src/core/markdown_utils.js' });
    return { data: {}, content: markdownContent };
  }
}


function removeShortcodes(content, patterns) {
  let processedContent = content;
  if (patterns && Array.isArray(patterns)) {
    // Sort patterns by length, descending, to match more specific patterns (like blocks) first.
    const sortedPatterns = [...patterns].sort((a, b) => b.length - a.length);

    sortedPatterns.forEach((patternStr, index) => {
      if (typeof patternStr !== 'string' || patternStr.trim() === '') return;
      try {
        let regex;
        if (patternStr.includes('([\\s\\S]*?)')) {
          regex = new RegExp(patternStr, 'gs');
        } else {
          regex = new RegExp(patternStr, 'g');
        }

        processedContent = processedContent.replace(regex, '');

      } catch (e) {
        logger.warn(`Invalid regex pattern for shortcode removal: '${patternStr}'. Skipping. Error: ${e.message}`, { module: 'src/core/markdown_utils.js' });
      }
    });
  }
  return processedContent;
}


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
          logger.warn('Invalid markdown-it plugin configuration found:', { module: 'src/core/markdown_utils.js', pluginConfig });
        }
      } catch (e) {
        logger.error(`Error applying custom markdown-it plugin '${pluginConfig}': ${e.message}`, { module: 'src/core/markdown_utils.js' });
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
      logger.warn('Markdown content does not start with an H1 heading, and no title was provided to prepend.', { module: 'src/core/markdown_utils.js' });
    }
    return processedContent;
  }
}

// --- Placeholder Substitution Functions ---


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


function substitutePlaceholdersInString(content, context, warningContext = 'value') {
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
      logger.warn(`Placeholder '{{ ${fullPath} }}' not found during ${warningContext} substitution.`, { module: 'src/core/markdown_utils.js' });
    }
    return match; // Return original match if placeholder not found
  });
  return { changed, newContent };
}


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
    logger.warn('Max substitution loops reached for context data. Check for circular placeholder references.', { module: 'src/core/markdown_utils.js' });
  }

  // Substitute placeholders in the main Markdown content using the fully processed context
  const { newContent: processedMainContent } = substitutePlaceholdersInString(mainContent, processingContext, 'main content');

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
  substituteAllPlaceholders
};
