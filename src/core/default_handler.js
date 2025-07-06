// src/core/default_handler.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');

// --- Imports from Path Registry ---
const {
  markdownUtilsPath,
  pdfGeneratorPath,
  mathIntegrationPath
} = require('@paths');

// --- Original requires, now using path anchors ---
const {
  extractFrontMatter,
  removeShortcodes,
  renderMarkdownToHtml,
  generateSlug,
  ensureAndPreprocessHeading,
  substituteAllPlaceholders
} = require(markdownUtilsPath);

const { generatePdf } = require(pdfGeneratorPath);
const createMathIntegration = require(mathIntegrationPath);
const mathIntegration = createMathIntegration();

class DefaultHandler {
  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    const { markdownFilePath } = data;

    try {
      if (!markdownFilePath || !fss.existsSync(markdownFilePath)) {
        throw new Error(`Input Markdown file not found: ${markdownFilePath}`);
      }
      await fs.mkdir(outputDir, { recursive: true });

      const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
      const { data: initialFrontMatter, content: contentWithoutFm } = extractFrontMatter(rawMarkdownContent);

      const contextForPlaceholders = {
        ...(globalConfig.params || {}),
        ...(pluginSpecificConfig.params || {}),
        ...initialFrontMatter
      };

      const { processedFmData, processedContent: contentAfterFMSubst } =
                substituteAllPlaceholders(contentWithoutFm, contextForPlaceholders);

      const patternsToRemove = [
        ...(globalConfig.global_remove_shortcodes || []),
        ...(pluginSpecificConfig.remove_shortcodes_patterns || [])
      ];
      const cleanedContent = removeShortcodes(contentAfterFMSubst, patternsToRemove);

      let finalOutputFilename = outputFilenameOpt;
      if (!finalOutputFilename) {
        const baseInputName = path.basename(markdownFilePath, path.extname(markdownFilePath));
        const titleSlug = generateSlug(processedFmData.title);
        const authorSlug = generateSlug(processedFmData.author);
        const dateSlug = processedFmData.date ? new Date(processedFmData.date).toISOString().split('T')[0] : '';

        const nameParts = [
          titleSlug || generateSlug(baseInputName),
          authorSlug,
          dateSlug
        ];

        finalOutputFilename = nameParts.filter(Boolean).join('-') + '.pdf';
      }
      if (!finalOutputFilename.toLowerCase().endsWith('.pdf')) {
        finalOutputFilename += '.pdf';
      }
      const outputPdfPath = path.join(outputDir, finalOutputFilename);

      let markdownToRender = cleanedContent;
      if (pluginSpecificConfig.inject_fm_title_as_h1 && !pluginSpecificConfig.omit_title_heading && processedFmData.title) {
        markdownToRender = ensureAndPreprocessHeading(
          cleanedContent,
          String(processedFmData.title),
          !!pluginSpecificConfig.aggressiveHeadingCleanup
        );
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
        pluginSpecificConfig.math,
        null,
        pluginSpecificConfig.markdown_it_options,
        pluginSpecificConfig.markdown_it_plugins
      );

      const cssFileContentsArray = [];
      if (pluginSpecificConfig.math && pluginSpecificConfig.math.enabled) {
        const mathCssStrings = await mathIntegration.getMathCssContent(pluginSpecificConfig.math);
        cssFileContentsArray.push(...mathCssStrings);
      }

      for (const cssFile of (pluginSpecificConfig.css_files || [])) {
        const cssFilePath = path.resolve(pluginBasePath, cssFile);
        if (fss.existsSync(cssFilePath)) {
          cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
        } else if (path.isAbsolute(cssFile) && fss.existsSync(cssFile)) {
          cssFileContentsArray.push(await fs.readFile(cssFile, 'utf8'));
        } else {
          console.warn(`WARN: CSS file not found: ${cssFilePath}`);
        }
      }

      const injectionPoints = {
        head_html: pluginSpecificConfig.head_html || '',
        body_html_start: pluginSpecificConfig.body_html_start || '',
        body_html_end: pluginSpecificConfig.body_html_end || '',
        lang: processedFmData.lang || 'en'
      };

      const templatePath = pluginSpecificConfig.html_template_path ? path.resolve(pluginBasePath, pluginSpecificConfig.html_template_path) : null;
      const htmlTemplateContent = templatePath && fss.existsSync(templatePath) ? await fs.readFile(templatePath, 'utf8') : null;

      await generatePdf(
        htmlBodyContent,
        outputPdfPath,
        mergedPdfOptions,
        cssFileContentsArray,
        htmlTemplateContent,
        injectionPoints
      );

      return outputPdfPath;
    } catch (error) {
      console.error(`Error during document generation: ${error.message}`, error.stack || '');
      return null;
    }
  }
}

module.exports = DefaultHandler;
