// src/plugins/plugin-manager.js
const {
  defaultHandlerPath,
  markdownUtilsPath,
  pdfGeneratorPath,
  loggerPath,
} = require('@paths');
const logger = require(loggerPath);
const DefaultHandler = require(defaultHandlerPath);
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);

// Object containing core utilities to be injected into plugins
const coreUtils = {
  DefaultHandler,
  markdownUtils,
  pdfGenerator,
};

class PluginManager {
  constructor() {
    // No setup needed here as ConfigResolver handles config.
    logger.debug('PluginManager initialized', {
      context: 'PluginManager',
    });
  }

  async invokeHandler(
    pluginName,
    effectiveConfig,
    data,
    outputDir,
    outputFilenameOpt,
  ) {
    const {
      pluginSpecificConfig,
      mainConfig,
      pluginBasePath,
      handlerScriptPath,
    } = effectiveConfig;

    logger.debug('Invoking handler for plugin', {
      context: 'PluginManager',
      plugin: pluginName,
      handlerScriptPath: handlerScriptPath,
    });

    if (!handlerScriptPath) {
      logger.error('Handler script path not available in effectiveConfig', {
        context: 'PluginManager',
        plugin: pluginName,
        error: `Handler script path not available in effectiveConfig for plugin '${pluginName}'.`,
      });
      throw new Error(
        `Handler script path not available in effectiveConfig for plugin '${pluginName}'.`,
      );
    }

    try {
      const HandlerModule = require(handlerScriptPath);
      let handlerInstance;

      if (
        typeof HandlerModule === 'function' &&
        HandlerModule.prototype &&
        HandlerModule.prototype.constructor.name === HandlerModule.name
      ) {
        // Pass coreUtils to the constructor
        handlerInstance = new HandlerModule(coreUtils);
        logger.debug(
          'Handler module is a class, instantiating with core utilities',
          {
            context: 'PluginManager',
            plugin: pluginName,
            handlerPath: handlerScriptPath,
          },
        );
      } else if (
        HandlerModule &&
        typeof HandlerModule.generate === 'function'
      ) {
        // For plain objects exporting a generate function, constructor injection isn't direct.
        // This pattern is now discouraged if coreUtils are needed.
        // The generate signature would need to change or plugins adopt the class pattern.
        // For now, we assume if it's not a class, it doesn't need coreUtils injected this way.
        // Or, it might have its own way of getting them (not ideal).
        logger.warn(`Plugin '${pluginName}' is not a class`, {
          context: 'PluginManager',
          plugin: pluginName,
          handlerPath: handlerScriptPath,
          suggestion:
            'Core utilities cannot be injected via constructor. Consider refactoring to a class.',
        });
        handlerInstance = HandlerModule;
      } else {
        logger.error(
          'Handler module does not export a class or a "generate" function',
          {
            context: 'PluginManager',
            plugin: pluginName,
            handlerPath: handlerScriptPath,
            error: `Handler module '${handlerScriptPath}' for plugin '${pluginName}' does not export a class or a 'generate' function.`,
          },
        );
        throw new Error(
          `Handler module '${handlerScriptPath}' for plugin '${pluginName}' does not export a class or a 'generate' function.`,
        );
      }

      if (typeof handlerInstance.generate !== 'function') {
        logger.error(
          `Handler instance for plugin '${pluginName}' does not have a 'generate' method`,
          {
            context: 'PluginManager',
            plugin: pluginName,
            handlerPath: handlerScriptPath,
          },
        );
        throw new Error(
          `Handler instance for plugin '${pluginName}' does not have a 'generate' method.`,
        );
      }

      logger.debug('Executing plugin handler generate method', {
        context: 'PluginManager',
        plugin: pluginName,
        handlerPath: handlerScriptPath,
      });
      // If generate signature were to be changed for non-class plugins:
      const result = await handlerInstance.generate(
        data,
        pluginSpecificConfig,
        mainConfig,
        outputDir,
        outputFilenameOpt,
        pluginBasePath,
      );
      logger.debug('Plugin handler execution completed', {
        context: 'PluginManager',
        plugin: pluginName,
        handlerPath: handlerScriptPath,
        status: 'success',
      });
      return result;
    } catch (error) {
      logger.error(
        `Error invoking handler for plugin '${pluginName}': ${error.message}`,
        {
          context: 'PluginManager',
          plugin: pluginName,
          handlerPath: handlerScriptPath,
          stack: error.stack,
        },
      );
      return null;
    }
  }
}

module.exports = PluginManager;
