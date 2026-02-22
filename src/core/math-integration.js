// src/core/math-integration.js

const { loggerPath, katexPath } = require('@paths');
const logger = require(loggerPath);

const KATEX_CSS_PATH = katexPath;

// Factory function to create the math integration module, allowing dependency injection
function createMathIntegration(dependencies = {}) {
  const fsPromises = dependencies.fsPromises || require('fs').promises;
  const fss = dependencies.fsSync || require('fs');

  const katexPluginModule = dependencies.katexPluginModule || require('@vscode/markdown-it-katex');

  function configureMarkdownItForMath(mdInstance, mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
      let pluginFunction;
      if (typeof katexPluginModule === 'function') {
        pluginFunction = katexPluginModule;
      } else if (katexPluginModule && typeof katexPluginModule.default === 'function') {
        pluginFunction = katexPluginModule.default;
      } else {
        logger.error('KaTeX plugin is not a function', {
          context: 'MathIntegration',
          error: 'Resolved KaTeX plugin or its .default is not a function. Cannot apply to markdown-it.',
          actualModuleType: typeof katexPluginModule
        });
        return;
      }

      const currentKatexOptions = mathConfig.katex_options || {};

      try {
        mdInstance.use(pluginFunction, currentKatexOptions);
        logger.debug('KaTeX math rendering enabled', {
          context: 'MathIntegration',
          status: 'md.use successful',
          options: currentKatexOptions
        });
      } catch (useError) {
        logger.error('Failed to apply KaTeX plugin to markdown-it instance', {
          context: 'MathIntegration',
          error: useError.message,
          stack: useError.stack
        });
      }
    }
  }

  async function getMathCssContent(mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
      logger.debug('Checking for KaTeX CSS', {
        context: 'MathIntegration',
        path: KATEX_CSS_PATH
      });

      if (fss.existsSync(KATEX_CSS_PATH)) {
        try {
          const cssContent = await fsPromises.readFile(KATEX_CSS_PATH, 'utf8');
          logger.debug('KaTeX CSS loaded', {
            context: 'MathIntegration',
            file: KATEX_CSS_PATH
          });
          return [cssContent];
        } catch (error) {
          logger.warn('Could not read KaTeX CSS file', {
            context: 'MathIntegration',
            file: KATEX_CSS_PATH,
            error: error.message,
            suggestion: 'Ensure the KaTeX CSS file is accessible and not corrupt.'
          });
          return [];
        }
      } else {
        logger.warn('KaTeX CSS file not found', {
          context: 'MathIntegration',
          resource: KATEX_CSS_PATH,
          suggestion: 'Math rendering might not be styled correctly. Ensure the KaTeX CSS path is correct.'
        });
        return [];
      }
    }
    return [];
  }

  return {
    configureMarkdownItForMath,
    getMathCssContent,
  };
}

module.exports = createMathIntegration;
