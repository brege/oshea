// src/plugins/PluginManager.js
const { defaultHandlerPath, markdownUtilsPath, pdfGeneratorPath, loggerPath } = require('@paths');
const logger = require(loggerPath);
const DefaultHandler = require(defaultHandlerPath);
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);

// Object containing core utilities to be injected into plugins
const coreUtils = {
  DefaultHandler,
  markdownUtils,
  pdfGenerator
};

class PluginManager {
  constructor() {
    // No setup needed here as ConfigResolver handles config.
  }


  async invokeHandler(pluginName, effectiveConfig, data, outputDir, outputFilenameOpt) {
    const {
      pluginSpecificConfig,
      mainConfig,
      pluginBasePath,
      handlerScriptPath
    } = effectiveConfig;

    if (!handlerScriptPath) {
      throw new Error(`Handler script path not available in effectiveConfig for plugin '${pluginName}'.`);
    }

    try {
      const HandlerModule = require(handlerScriptPath);
      let handlerInstance;

      if (typeof HandlerModule === 'function' && HandlerModule.prototype && HandlerModule.prototype.constructor.name === HandlerModule.name) {
        // Pass coreUtils to the constructor
        handlerInstance = new HandlerModule(coreUtils);
      } else if (HandlerModule && typeof HandlerModule.generate === 'function') {
        // For plain objects exporting a generate function, constructor injection isn't direct.
        // This pattern is now discouraged if coreUtils are needed.
        // The generate signature would need to change or plugins adopt the class pattern.
        // For now, we assume if it's not a class, it doesn't need coreUtils injected this way.
        // Or, it might have its own way of getting them (not ideal).
        logger.warn(`Plugin '${pluginName}' is not a class. Core utilities cannot be injected via constructor.`, { module: 'plugins/PluginManager' });
        handlerInstance = HandlerModule;
      } else {
        throw new Error(`Handler module '${handlerScriptPath}' for plugin '${pluginName}' does not export a class or a 'generate' function.`);
      }

      if (typeof handlerInstance.generate !== 'function') {
        throw new Error(`Handler instance for plugin '${pluginName}' does not have a 'generate' method.`);
      }

      // If generate signature were to be changed for non-class plugins:
      return await handlerInstance.generate(
        data,
        pluginSpecificConfig,
        mainConfig,
        outputDir,
        outputFilenameOpt,
        pluginBasePath
      );
    } catch (error) {
      logger.error(`ERROR invoking handler for plugin '${pluginName}' from '${handlerScriptPath}': ${error.message}`, { module: 'plugins/PluginManager', error, pluginName, handlerScriptPath });
      logger.error(error.stack, { module: 'plugins/PluginManager' });
      return null;
    }
  }
}

module.exports = PluginManager;
