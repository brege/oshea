// src/ConfigResolver.js
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os'); // Added for XDG path
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml'; // e.g., cv.config.yaml

class ConfigResolver {
    constructor(mainConfigPathFromCli) {
        this.projectRoot = path.resolve(__dirname, '..'); // For bundled plugins
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');
        
        // Determine XDG Config Home
        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);

        // Main config (from CLI or default path) - will be loaded when first needed
        this.cliOrGlobalMainConfigPath = mainConfigPathFromCli; // Path from --config, or undefined
        this.mainConfig = null; // Stores the global config (from CLI or XDG global or default tool's global)
        
        this.loadedPluginConfigsCache = {}; // Cache for fully resolved { effectiveConfig, pluginBasePath, handlerScriptPath }
        this._rawPluginYamlCache = {}; // Cache for raw loaded yamls to avoid re-reading { path: {rawConfig, basePathForAssets, inherit_css} }
    }

    /**
     * Loads the primary main/global configuration file.
     * Priority:
     * 1. Path from --config CLI argument (this.cliOrGlobalMainConfigPath if set)
     * 2. XDG global config (~/.config/md-to-pdf/config.yaml)
     * 3. Bundled default config (md-to-pdf-install-dir/config.yaml)
     * @returns {Promise<Object>} The loaded main configuration object.
     * @private
     */
    async _loadPrimaryMainConfig() {
        if (this.mainConfig) {
            return this.mainConfig;
        }

        let configPathToLoad = this.defaultMainConfigPath; // Fallback to bundled
        const xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        if (this.cliOrGlobalMainConfigPath && fs.existsSync(this.cliOrGlobalMainConfigPath)) {
            configPathToLoad = this.cliOrGlobalMainConfigPath;
        } else if (fs.existsSync(xdgGlobalConfigPath)) {
            configPathToLoad = xdgGlobalConfigPath;
        } else if (!fs.existsSync(this.defaultMainConfigPath)){
             console.warn(`WARN: Default main configuration file '${this.defaultMainConfigPath}' not found. Using empty config.`);
             this.mainConfig = {};
             return this.mainConfig;
        }
        
        try {
            console.log(`Loading main configuration from: ${configPathToLoad}`);
            this.mainConfig = await loadYamlConfig(configPathToLoad);
            return this.mainConfig;
        } catch (error) {
            console.error(`ERROR loading main configuration from '${configPathToLoad}': ${error.message}`);
            // Fallback to an empty config if loading fails, to allow plugins to still load their defaults
            this.mainConfig = {}; 
            return this.mainConfig;
        }
    }
    
    /**
     * Loads a single layer of plugin-specific configuration (e.g., bundled, xdg, or project).
     * @param {string} configFilePath Absolute path to the plugin's .config.yaml file.
     * @param {string} assetsBasePath Absolute path to the directory where assets (CSS) for this config layer are located.
     * @returns {Promise<{rawConfig: Object, resolvedCssPaths: string[], inherit_css: boolean}|null>}
     * Returns null if configFilePath does not exist.
     * @private
     */
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        if (this._rawPluginYamlCache[configFilePath]) {
            return this._rawPluginYamlCache[configFilePath];
        }

        if (!fs.existsSync(configFilePath)) {
            return null; // Layer doesn't exist
        }

        try {
            const rawConfig = await loadYamlConfig(configFilePath);
            let resolvedCssPaths = [];
            if (rawConfig.css_files && Array.isArray(rawConfig.css_files)) {
                resolvedCssPaths = rawConfig.css_files.map(cssFile => {
                    if (typeof cssFile !== 'string') {
                        console.warn(`WARN: Non-string CSS file entry ignored in ${configFilePath}: ${cssFile}`);
                        return null;
                    }
                    if (path.isAbsolute(cssFile)) return cssFile;
                    return path.resolve(assetsBasePath, cssFile);
                }).filter(Boolean); // Remove nulls from invalid entries
            }
            const inherit_css = rawConfig.inherit_css === true; // Defaults to false if not true
            
            const result = { rawConfig, resolvedCssPaths, inherit_css };
            this._rawPluginYamlCache[configFilePath] = result;
            return result;
        } catch (error) {
            console.error(`ERROR loading plugin configuration layer from '${configFilePath}': ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false }; // Return empty on error to not break chain
        }
    }

    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                // Do not merge 'css_files' or 'inherit_css' directly with deepMerge,
                // they are handled by the specific layering logic.
                if (key === 'css_files' || key === 'inherit_css') {
                    if (source[key] !== undefined) { // Only take from source if defined
                        output[key] = source[key];
                    }
                } else if (this._isObject(source[key]) && key in target && this._isObject(target[key])) {
                    output[key] = this._deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    async getEffectiveConfig(pluginName) {
        if (this.loadedPluginConfigsCache[pluginName]) {
            return this.loadedPluginConfigsCache[pluginName];
        }

        const mainConfig = await this._loadPrimaryMainConfig(); // Loads CLI-provided, or XDG global, or bundled default config.yaml
        let currentMergedConfig = {};
        let currentCssPaths = [];

        // Layer 0: Bundled Plugin Defaults
        const bundledPluginConfigFileName = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX;
        const bundledPluginDir = path.join(this.projectRoot, 'plugins', pluginName);
        const bundledPluginConfigPath = path.join(bundledPluginDir, bundledPluginConfigFileName);
        
        const layer0Data = await this._loadSingleConfigLayer(bundledPluginConfigPath, bundledPluginDir);
        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig;
            currentCssPaths = layer0Data.resolvedCssPaths || [];
        } else {
            // This is a critical failure - bundled plugin config must exist if plugin is valid
            throw new Error(`Bundled configuration for plugin '${pluginName}' not found at '${bundledPluginConfigPath}'.`);
        }
        const bundledPluginBasePath = bundledPluginDir; // Base path for the handler script

        // Layer 1: XDG User Defaults for the specific plugin
        const xdgPluginDir = path.join(this.xdgBaseDir, pluginName);
        const xdgPluginConfigPath = path.join(xdgPluginDir, bundledPluginConfigFileName); // e.g., ~/.config/md-to-pdf/cv/cv.config.yaml
        
        const layer1Data = await this._loadSingleConfigLayer(xdgPluginConfigPath, xdgPluginDir);
        if (layer1Data && layer1Data.rawConfig) {
            currentMergedConfig = this._deepMerge(currentMergedConfig, layer1Data.rawConfig);
            if (layer1Data.rawConfig.css_files !== undefined) { // Check if css_files key exists
                if (layer1Data.inherit_css) {
                    currentCssPaths.push(...layer1Data.resolvedCssPaths);
                } else {
                    currentCssPaths = layer1Data.resolvedCssPaths;
                }
            }
        }
        
        // (Layer 2: Project-Specific Config will be added here in the next step)

        // Finalize: Merge global PDF options from the loaded mainConfig
        if (mainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = this._deepMerge(
                mainConfig.global_pdf_options, // Base
                currentMergedConfig.pdf_options || {}  // Overrides
            );
        }
        currentMergedConfig.css_files = [...new Set(currentCssPaths)]; // Deduplicate CSS paths

        if (!currentMergedConfig.handler_script) {
            throw new Error(`Handler script not specified in effective configuration for plugin '${pluginName}'.`);
        }
        const handlerScriptPath = path.resolve(bundledPluginBasePath, currentMergedConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'. Resolved from bundled plugin path.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: mainConfig,
            pluginBasePath: bundledPluginBasePath, // For handler's own relative assets
            handlerScriptPath: handlerScriptPath
        };
        
        this.loadedPluginConfigsCache[pluginName] = effectiveDetails;
        return effectiveDetails;
    }
}

module.exports = ConfigResolver;
