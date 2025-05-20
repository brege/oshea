// src/ConfigResolver.js
const fs = require('fs'); // For synchronous operations like existsSync
const fsp = require('fs').promises; // For asynchronous file operations
const path = require('path'); // Correctly require path
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

class ConfigResolver {
    constructor(mainConfigPathFromCli) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');
        this.mainConfigPath = mainConfigPathFromCli || this.defaultMainConfigPath;
        this.mainConfigBaseDir = path.dirname(this.mainConfigPath);
        this.mainConfig = null;
        this.loadedPluginConfigsCache = {};
    }

    async _loadMainConfig() {
        if (this.mainConfig) {
            return this.mainConfig;
        }
        try {
            if (!fs.existsSync(this.mainConfigPath)) {
                if (this.mainConfigPath === this.defaultMainConfigPath) {
                    console.warn(`WARN: Default main configuration file '${this.defaultMainConfigPath}' not found. Using empty config.`);
                    this.mainConfig = {};
                    return this.mainConfig;
                } else {
                    throw new Error(`Main configuration file '${this.mainConfigPath}' (from --config) not found.`);
                }
            }
            // loadYamlConfig from markdown_utils uses fs.readFile (async) internally
            this.mainConfig = await loadYamlConfig(this.mainConfigPath);
            return this.mainConfig;
        } catch (error) {
            console.error(`ERROR loading main configuration from '${this.mainConfigPath}': ${error.message}`);
            throw error;
        }
    }

    async _loadRawBundledPluginConfig(pluginName, mainConfig) {
        if (this.loadedPluginConfigsCache[pluginName]) {
            return this.loadedPluginConfigsCache[pluginName];
        }
        const registeredPluginPaths = mainConfig.document_type_plugins || {};
        const relativePluginConfigPath = registeredPluginPaths[pluginName];

        if (!relativePluginConfigPath) {
            console.warn(`WARN: Plugin '${pluginName}' is not registered in main config's 'document_type_plugins'.`);
            return null;
        }
        const absolutePluginConfigPath = path.resolve(this.projectRoot, relativePluginConfigPath);
        const pluginBasePath = path.dirname(absolutePluginConfigPath);

        try {
            const rawConfig = await loadYamlConfig(absolutePluginConfigPath);
            const details = { rawConfig, basePath: pluginBasePath };
            this.loadedPluginConfigsCache[pluginName] = details;
            return details;
        } catch (error) {
            console.error(`ERROR: Could not load configuration for plugin '${pluginName}' from '${absolutePluginConfigPath}': ${error.message}`);
            return null;
        }
    }

    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key]) && key in target && this._isObject(target[key])) {
                    output[key] = this._deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    async getEffectiveConfig(pluginName) {
        const mainConfig = await this._loadMainConfig();
        const rawPluginDetails = await this._loadRawBundledPluginConfig(pluginName, mainConfig);

        if (!rawPluginDetails) {
            throw new Error(`Could not load raw configuration for plugin '${pluginName}'.`);
        }
        const { rawConfig: pluginDiskConfig, basePath: pluginBasePath } = rawPluginDetails;
        let effectivePluginConfig = { ...pluginDiskConfig };

        if (mainConfig.global_pdf_options) {
            effectivePluginConfig.pdf_options = this._deepMerge(
                mainConfig.global_pdf_options,
                effectivePluginConfig.pdf_options || {}
            );
        }
        let resolvedCssPaths = [];
        if (effectivePluginConfig.css_files && Array.isArray(effectivePluginConfig.css_files)) {
            resolvedCssPaths = effectivePluginConfig.css_files.map(cssFile => {
                if (path.isAbsolute(cssFile)) return cssFile;
                return path.resolve(pluginBasePath, cssFile);
            });
        }
        effectivePluginConfig.css_files = resolvedCssPaths;

        if (!effectivePluginConfig.handler_script) {
            throw new Error(`Handler script not specified in configuration for plugin '${pluginName}'.`);
        }
        const handlerScriptPath = path.resolve(pluginBasePath, effectivePluginConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'.`);
        }
        return {
            pluginSpecificConfig: effectivePluginConfig,
            mainConfig: mainConfig,
            pluginBasePath: pluginBasePath,
            handlerScriptPath: handlerScriptPath
        };
    }
}
module.exports = ConfigResolver;
