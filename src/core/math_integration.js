// src/core/math_integration.js

const { loggerPath, katexPath } = require('@paths');
const logger = require(loggerPath);

const KATEX_CSS_PATH = katexPath;

// Factory function to create the math integration module, allowing dependency injection
function createMathIntegration(dependencies = {}) {
  const fs_promises = dependencies.fsPromises || require('fs').promises;
  const fss = dependencies.fsSync || require('fs'); // For existsSync

  const katexPluginModule = dependencies.katexPluginModule || require('@vscode/markdown-it-katex');

  function configureMarkdownItForMath(mdInstance, mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
      let currentKatexPluginModule = katexPluginModule;

      let pluginFunction = null;
      if (typeof currentKatexPluginModule === 'function') {
        pluginFunction = currentKatexPluginModule;
      } else if (currentKatexPluginModule && typeof currentKatexPluginModule.default === 'function') {
        pluginFunction = currentKatexPluginModule.default;
      } else {
        logger.error('The resolved KaTeX plugin (or its .default) is not a function. Cannot apply to markdown-it.', { module: 'src/core/math_integration.js', actualModule: currentKatexPluginModule });
        return;
      }

      const currentKatexOptions = mathConfig.katex_options || {};

      try {
        mdInstance.use(pluginFunction, currentKatexOptions);
        logger.info('KaTeX math rendering enabled for markdown-it (md.use successful).', { module: 'src/core/math_integration.js' });
      } catch (useError) {
        logger.error('mdInstance.use(katexPlugin) failed directly:', { module: 'src/core/math_integration.js', error: useError });
        if (useError.stack) {
          logger.error(useError.stack, { module: 'src/core/math_integration.js' });
        }
      }
    }
  }



  async function getMathCssContent(mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
      logger.detail(`[math_integration.js] getMathCssContent: Checking for KaTeX CSS at ${KATEX_CSS_PATH}`, { module: 'src/core/math_integration.js' });

      if (fss.existsSync(KATEX_CSS_PATH)) {
        try {
          const cssContent = await fs_promises.readFile(KATEX_CSS_PATH, 'utf8');
          logger.info('KaTeX CSS loaded.', { module: 'src/core/math_integration.js' });
          return [cssContent];
        } catch (error) {
          logger.warn(`Could not read KaTeX CSS file from ${KATEX_CSS_PATH}: ${error.message}`, { module: 'src/core/math_integration.js' });
          return [];
        }
      } else {
        logger.warn(`KaTeX CSS file not found at expected path: ${KATEX_CSS_PATH}. Math rendering might not be styled correctly.`, { module: 'src/core/math_integration.js' });
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
