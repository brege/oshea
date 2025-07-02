// src/plugins/PluginManager.js
const { defaultHandlerPath, markdownUtilsPath, pdfGeneratorPath } = require('@paths');
const path = require('path');
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
    /**
     * Constructor is now very simple.
     * It doesn't manage config loading anymore.
     */
    constructor() {
        // No setup needed here as ConfigResolver handles config.
    }

    /**
     * Invokes the handler for a given plugin using a pre-resolved effective configuration.
     * @param {string} pluginName - The name of the plugin (for logging/error context).
     * @param {Object} effectiveConfig - The fully resolved configuration object from ConfigResolver.
     * Expected to contain:
     * - pluginSpecificConfig: Object
     * - mainConfig: Object
     * - pluginBasePath: string (Base path of the original plugin, for its handler to resolve other assets)
     * - handlerScriptPath: string (Absolute path to the handler script)
     * @param {Object} data - Input data for the plugin (e.g., { markdownFilePath: 'path/to/file.md' }).
     * @param {string} outputDir - The directory to output generated files.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @returns {Promise<string|null>} Path to the generated PDF, or null if an error occurs.
     */
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
                console.warn(`WARN: Plugin '${pluginName}' is not a class. Core utilities cannot be injected via constructor.`);
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
            console.error(`ERROR invoking handler for plugin '${pluginName}' from '${handlerScriptPath}': ${error.message}`);
            console.error(error.stack);
            return null;
        }
    }
}

module.exports = PluginManager;
