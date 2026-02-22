// src/core/default-handler.js
const fs = require('node:fs').promises;
const fss = require('node:fs');
const path = require('node:path');

const {
  markdownUtilsPath,
  pdfGeneratorPath,
  mathIntegrationPath,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);
const {
  extractFrontMatter,
  removeShortcodes,
  renderMarkdownToHtml,
  generateSlug,
  ensureAndPreprocessHeading,
  substituteAllPlaceholders,
} = require(markdownUtilsPath);

const { generatePdf } = require(pdfGeneratorPath);
const createMathIntegration = require(mathIntegrationPath);
const mathIntegration = createMathIntegration();

class DefaultHandler {
  async generate(
    data,
    pluginSpecificConfig,
    globalConfig,
    outputDir,
    outputFilenameOpt,
    pluginBasePath,
  ) {
    const { markdownFilePath } = data;

    try {
      if (!markdownFilePath || !fss.existsSync(markdownFilePath)) {
        const errorMessage = `Input Markdown file not found: ${markdownFilePath}`;
        logger.error('Document generation failed', {
          context: 'DefaultHandler',
          file: markdownFilePath,
          operation: 'document generation',
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      logger.debug('Starting document generation', {
        context: 'DefaultHandler',
        markdownFilePath: markdownFilePath,
        outputDir: outputDir,
      });

      await fs.mkdir(outputDir, { recursive: true });
      logger.debug('Output directory ensured', {
        context: 'DefaultHandler',
        outputDir: outputDir,
      });

      const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
      const { data: initialFrontMatter, content: contentWithoutFm } =
        extractFrontMatter(rawMarkdownContent);
      logger.debug('Front matter extracted', {
        context: 'DefaultHandler',
        markdownFilePath: markdownFilePath,
      });

      const contextForPlaceholders = {
        ...(globalConfig.params || {}),
        ...(pluginSpecificConfig.params || {}),
        ...initialFrontMatter,
      };

      const { processedFmData, processedContent: contentAfterFMSubst } =
        substituteAllPlaceholders(contentWithoutFm, contextForPlaceholders);
      logger.debug('Placeholders substituted', {
        context: 'DefaultHandler',
        file: markdownFilePath,
      });

      const patternsToRemove = [
        ...(globalConfig.global_remove_shortcodes || []),
        ...(pluginSpecificConfig.remove_shortcodes_patterns || []),
      ];
      const cleanedContent = removeShortcodes(
        contentAfterFMSubst,
        patternsToRemove,
      );
      logger.debug('Shortcodes removed', {
        context: 'DefaultHandler',
        count: patternsToRemove.length,
      });

      let finalOutputFilename = outputFilenameOpt;
      if (!finalOutputFilename) {
        const baseInputName = path.basename(
          markdownFilePath,
          path.extname(markdownFilePath),
        );
        const titleSlug = generateSlug(processedFmData.title);
        const authorSlug = generateSlug(processedFmData.author);
        const dateSlug = processedFmData.date
          ? new Date(processedFmData.date).toISOString().split('T')[0]
          : '';

        const nameParts = [
          titleSlug || generateSlug(baseInputName),
          authorSlug,
          dateSlug,
        ];

        finalOutputFilename = `${nameParts.filter(Boolean).join('-')}.pdf`;
        logger.debug('Generated output filename', {
          context: 'DefaultHandler',
          filename: finalOutputFilename,
          source: 'auto-generated',
        });
      }
      if (!finalOutputFilename.toLowerCase().endsWith('.pdf')) {
        finalOutputFilename += '.pdf';
        logger.debug('Appended .pdf extension to filename', {
          context: 'DefaultHandler',
          filename: finalOutputFilename,
        });
      }
      const outputPdfPath = path.join(outputDir, finalOutputFilename);
      logger.debug('Determined output PDF path', {
        context: 'DefaultHandler',
        outputPath: outputPdfPath,
      });

      let markdownToRender = cleanedContent;
      if (
        pluginSpecificConfig.inject_fm_title_as_h1 &&
        !pluginSpecificConfig.omit_title_heading &&
        processedFmData.title
      ) {
        markdownToRender = ensureAndPreprocessHeading(
          cleanedContent,
          String(processedFmData.title),
          !!pluginSpecificConfig.aggressiveHeadingCleanup,
        );
        logger.debug('Injected front matter title as H1', {
          context: 'DefaultHandler',
          title: processedFmData.title,
        });
      }

      const mergedPdfOptions = {
        ...(globalConfig.global_pdf_options || {}),
        ...(pluginSpecificConfig.pdf_options || {}),
        margin: {
          ...(globalConfig.global_pdf_options?.margin || {}),
          ...(pluginSpecificConfig.pdf_options?.margin || {}),
        },
      };
      logger.debug('Merged PDF options', {
        context: 'DefaultHandler',
      });

      const htmlBodyContent = renderMarkdownToHtml(
        markdownToRender,
        pluginSpecificConfig.toc_options,
        mergedPdfOptions.anchor_options,
        pluginSpecificConfig.math,
        null,
        pluginSpecificConfig.markdown_it_options,
        pluginSpecificConfig.markdown_it_plugins,
      );
      logger.debug('Markdown rendered to HTML', {
        context: 'DefaultHandler',
      });

      const cssFileContentsArray = [];
      if (pluginSpecificConfig.math?.enabled) {
        const mathCssStrings = await mathIntegration.getMathCssContent(
          pluginSpecificConfig.math,
        );
        cssFileContentsArray.push(...mathCssStrings);
        logger.debug('Math CSS content retrieved', {
          context: 'DefaultHandler',
          mathConfig: pluginSpecificConfig.math,
        });
      }

      const styleHyperlinks =
        processedFmData.style_hyperlinks !== undefined
          ? processedFmData.style_hyperlinks
          : globalConfig.style_hyperlinks;
      if (styleHyperlinks === false) {
        const noLinkStylesCss =
          'a,a:link,a:visited,a:hover,a:active{color:inherit!important;text-decoration:none!important;font-weight:inherit!important}';
        cssFileContentsArray.push(noLinkStylesCss);
        logger.debug('Hyperlink styling disabled', {
          context: 'DefaultHandler',
        });
      }

      for (const cssFile of pluginSpecificConfig.css_files || []) {
        const cssFilePath = path.resolve(pluginBasePath, cssFile);
        if (fss.existsSync(cssFilePath)) {
          cssFileContentsArray.push(await fs.readFile(cssFilePath, 'utf8'));
          logger.debug('CSS file loaded', {
            context: 'DefaultHandler',
            file: cssFilePath,
          });
        } else if (path.isAbsolute(cssFile) && fss.existsSync(cssFile)) {
          cssFileContentsArray.push(await fs.readFile(cssFile, 'utf8'));
          logger.debug('Absolute CSS file loaded', {
            context: 'DefaultHandler',
            file: cssFile,
          });
        } else {
          logger.warn('CSS file not found', {
            context: 'DefaultHandler',
            resource: cssFilePath,
            suggestion: 'Configure pdf_viewer in settings',
          });
        }
      }

      const injectionPoints = {
        head_html: pluginSpecificConfig.head_html || '',
        body_html_start: pluginSpecificConfig.body_html_start || '',
        body_html_end: pluginSpecificConfig.body_html_end || '',
        lang: processedFmData.lang || 'en',
      };

      const templatePath = pluginSpecificConfig.html_template_path
        ? path.resolve(pluginBasePath, pluginSpecificConfig.html_template_path)
        : null;
      const htmlTemplateContent =
        templatePath && fss.existsSync(templatePath)
          ? await fs.readFile(templatePath, 'utf8')
          : null;
      if (templatePath) {
        logger.debug('HTML template path resolved', {
          context: 'DefaultHandler',
          templatePath: templatePath,
          found: !!htmlTemplateContent,
        });
      }

      await generatePdf(
        htmlBodyContent,
        outputPdfPath,
        mergedPdfOptions,
        cssFileContentsArray,
        htmlTemplateContent,
        injectionPoints,
      );

      logger.success('PDF generated successfully', {
        context: 'DefaultHandler',
        outputPath: outputPdfPath,
        operation: 'document generation',
      });
      return outputPdfPath;
    } catch (error) {
      logger.error('Document generation failed', {
        context: 'DefaultHandler',
        error: error.message,
        operation: 'document generation',
        file: markdownFilePath,
        stack: error.stack,
      });
      return null;
    }
  }
}

module.exports = DefaultHandler;
