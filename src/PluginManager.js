// src/PluginManager.js
const fs = require('fs').promises;
const path = require('path');
const { loadConfig: loadYamlConfig } = require('./markdown_utils'); // Renamed to avoid conflict if we add a loadConfig method here

class PluginManager {
    /**
     * @param {Object} mainConfig - The already loaded main configuration object (from the root config.yaml).
     */
    constructor(mainConfig) {
        this.mainConfig = mainConfig;
        this.registeredPluginPaths = this.mainConfig.document_type_plugins || {};
        this.loadedPluginConfigs = {}; // Cache for loaded plugin configurations: { pluginName: { config: object, basePath: string } }
        this.projectRoot = path.resolve(__dirname, '..'); // Assuming src/ is one level down from project root
    }

    /**
     * Loads a plugin's specific configuration file.
     * @param {string} pluginName - The name of the plugin to load.
     * @returns {Promise<Object|null>} The loaded plugin configuration object, or null if an error occurs.
     * The returned object will also have a 'basePath' property pointing to the plugin's directory.
     */
    async loadPluginConfig(pluginName) {
        if (this.loadedPluginConfigs[pluginName]) {
            return this.loadedPluginConfigs[pluginName].config;
        }

        const relativeConfigPath = this.registeredPluginPaths[pluginName];
        if (!relativeConfigPath) {
            console.warn(`WARN: Plugin '${pluginName}' is not registered in the main configuration's 'document_type_plugins'.`);
            return null;
        }

        const absoluteConfigPath = path.resolve(this.projectRoot, relativeConfigPath);

        try {
            const config = await loadYamlConfig(absoluteConfigPath);
            const basePath = path.dirname(absoluteConfigPath);
            this.loadedPluginConfigs[pluginName] = { config, basePath };
            return config;
        } catch (error) {
            console.error(`ERROR: Could not load configuration for plugin '${pluginName}' from '${absoluteConfigPath}': ${error.message}`);
            return null;
        }
    }

    /**
     * Retrieves the fully processed details for a given plugin, including its
     * configuration and base path.
     * @param {string} pluginName - The name of the plugin.
     * @returns {Promise<{config: Object, basePath: string}|null>} Object containing plugin config and its base path.
     */
    async getPluginDetails(pluginName) {
        if (!this.loadedPluginConfigs[pluginName]) {
            await this.loadPluginConfig(pluginName); // Ensure config is loaded
        }
        return this.loadedPluginConfigs[pluginName] || null;
    }

    /**
     * Invokes the handler for a given plugin.
     * @param {string} pluginName - The name of the plugin.
     * @param {Object} data - Input data for the plugin (e.g., { markdownFilePath: 'path/to/file.md' }).
     * @param {string} outputDir - The directory to output generated files.
     * @param {string} [outputFilenameOpt] - Optional. The desired output filename.
     * @returns {Promise<string|null>} Path to the generated PDF, or null if an error occurs.
     */
    async invokeHandler(pluginName, data, outputDir, outputFilenameOpt) {
        const pluginDetails = await this.getPluginDetails(pluginName);

        if (!pluginDetails || !pluginDetails.config) {
            throw new Error(`Plugin '${pluginName}' configuration could not be loaded.`);
        }
        const { config: pluginSpecificConfig, basePath: pluginBasePath } = pluginDetails;

        if (!pluginSpecificConfig.handler_script) {
            throw new Error(`Handler script not specified in configuration for plugin '${pluginName}'.`);
        }

        const handlerScriptPath = path.resolve(pluginBasePath, pluginSpecificConfig.handler_script);

        try {
            const HandlerModule = require(handlerScriptPath);
            let handlerInstance;

            // Check if HandlerModule is a class or a module with a generate function
            if (typeof HandlerModule === 'function' && HandlerModule.prototype && HandlerModule.prototype.constructor.name === HandlerModule.name) {
                // It's likely a class
                handlerInstance = new HandlerModule();
            } else if (HandlerModule && typeof HandlerModule.generate === 'function') {
                // It's an object with a generate function
                handlerInstance = HandlerModule;
            } else {
                throw new Error(`Handler module '${handlerScriptPath}' does not export a class or a 'generate' function.`);
            }
            
            if (typeof handlerInstance.generate !== 'function') {
                throw new Error(`Handler instance for plugin '${pluginName}' does not have a 'generate' method.`);
            }

            return await handlerInstance.generate(
                data,
                pluginSpecificConfig,
                this.mainConfig, // Pass the main global config
                outputDir,
                outputFilenameOpt,
                pluginBasePath // Pass plugin's base path for asset resolution within the handler
            );
        } catch (error) {
            console.error(`ERROR invoking handler for plugin '${pluginName}' from '${handlerScriptPath}': ${error.message}`);
            console.error(error.stack); // Log stack for easier debugging
            return null; // Or rethrow, depending on desired error handling in cli.js
        }
    }

    /**
     * Lists all registered plugin names.
     * @returns {string[]} Array of plugin names.
     */
    listPlugins() {
        return Object.keys(this.registeredPluginPaths);
    }
}

module.exports = PluginManager;
