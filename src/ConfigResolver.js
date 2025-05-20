// src/ConfigResolver.js
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class ConfigResolver {
    constructor(mainConfigPathFromCli) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml'); // Bundled global config

        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli; // Path from --config to the project's "main" config
        this.projectManifestConfig = null; // Loaded on demand if path is given
        this.projectManifestBaseDir = this.projectManifestConfigPath ? path.dirname(this.projectManifestConfigPath) : null;

        this.primaryMainConfig = null; // For global settings like pdf_viewer, global_pdf_options
        
        this.loadedPluginConfigsCache = {}; 
        this._rawPluginYamlCache = {}; 
    }

    async _loadProjectManifestConfig() {
        if (this.projectManifestConfig) return this.projectManifestConfig;
        if (!this.projectManifestConfigPath) return null;

        if (!fs.existsSync(this.projectManifestConfigPath)) {
            console.warn(`WARN: Project manifest configuration file (from --config) '${this.projectManifestConfigPath}' not found.`);
            this.projectManifestConfig = {}; // Set to empty to avoid re-attempts
            return this.projectManifestConfig;
        }
        try {
            this.projectManifestConfig = await loadYamlConfig(this.projectManifestConfigPath);
            return this.projectManifestConfig;
        } catch (error) {
            console.error(`ERROR loading project manifest configuration from '${this.projectManifestConfigPath}': ${error.message}`);
            this.projectManifestConfig = {}; // Set to empty on error
            return this.projectManifestConfig;
        }
    }

    async _loadPrimaryMainConfig() {
        if (this.primaryMainConfig) {
            return this.primaryMainConfig;
        }

        let configPathToLoad = this.defaultMainConfigPath; 
        let loadedFrom = "bundled default";

        if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
            // If --config is used, it takes precedence for global settings too
            configPathToLoad = this.projectManifestConfigPath;
            loadedFrom = "project (from --config)";
        } else if (fs.existsSync(this.xdgGlobalConfigPath)) {
            configPathToLoad = this.xdgGlobalConfigPath;
            loadedFrom = "XDG global";
        } else if (!fs.existsSync(this.defaultMainConfigPath)) {
             console.warn(`WARN: Default main configuration file '${this.defaultMainConfigPath}' not found. Using empty config for global settings.`);
             this.primaryMainConfig = {};
             return this.primaryMainConfig;
        }
        
        try {
            // console.log(`Loading primary main configuration (for globals) from: ${configPathToLoad} (${loadedFrom})`);
            this.primaryMainConfig = await loadYamlConfig(configPathToLoad);
            return this.primaryMainConfig;
        } catch (error) {
            console.error(`ERROR loading primary main configuration from '${configPathToLoad}': ${error.message}`);
            this.primaryMainConfig = {}; 
            return this.primaryMainConfig;
        }
    }
    
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        if (this._rawPluginYamlCache[configFilePath]) {
            return this._rawPluginYamlCache[configFilePath];
        }
        if (!configFilePath || !fs.existsSync(configFilePath)) { // Added check for configFilePath
            return null; 
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
                }).filter(Boolean);
            }
            const inherit_css = rawConfig.inherit_css === true; 
            
            const result = { rawConfig, resolvedCssPaths, inherit_css };
            this._rawPluginYamlCache[configFilePath] = result;
            return result;
        } catch (error) {
            console.error(`ERROR loading plugin configuration layer from '${configFilePath}': ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false };
        }
    }

    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (key === 'css_files' || key === 'inherit_css') {
                    if (source[key] !== undefined) {
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

        const primaryMainConfig = await this._loadPrimaryMainConfig();
        let currentMergedConfig = {};
        let currentCssPaths = [];

        // Layer 0: Bundled Plugin Defaults
        const bundledPluginConfigFileName = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX;
        const bundledPluginDir = path.join(this.projectRoot, 'plugins', pluginName);
        const bundledPluginConfigPath = path.join(bundledPluginDir, bundledPluginConfigFileName);
        
        const layer0Data = await this._loadSingleConfigLayer(bundledPluginConfigPath, bundledPluginDir);
        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig; // Start with bundled as base
            currentCssPaths = layer0Data.resolvedCssPaths || [];
        } else {
            throw new Error(`Bundled configuration for plugin '${pluginName}' not found at '${bundledPluginConfigPath}'.`);
        }
        const bundledPluginBasePath = bundledPluginDir;

        // Layer 1: XDG User Defaults for the specific plugin
        const xdgPluginDir = path.join(this.xdgBaseDir, pluginName);
        const xdgPluginConfigPath = path.join(xdgPluginDir, bundledPluginConfigFileName);
        
        const layer1Data = await this._loadSingleConfigLayer(xdgPluginConfigPath, xdgPluginDir);
        if (layer1Data && layer1Data.rawConfig) {
            currentMergedConfig = this._deepMerge(currentMergedConfig, layer1Data.rawConfig);
            if (layer1Data.rawConfig.css_files !== undefined) {
                if (layer1Data.inherit_css) {
                    currentCssPaths.push(...layer1Data.resolvedCssPaths);
                } else {
                    currentCssPaths = layer1Data.resolvedCssPaths;
                }
            }
        }
        
        // Layer 2: Project-Specific Config (from --config)
        const projectManifestConfig = await this._loadProjectManifestConfig(); // Load the file passed to --config
        if (projectManifestConfig && projectManifestConfig.document_type_plugins) {
            const projectPluginSpecificConfigPathRel = projectManifestConfig.document_type_plugins[pluginName];
            if (projectPluginSpecificConfigPathRel && this.projectManifestBaseDir) {
                const projectPluginSpecificConfigPathAbs = path.resolve(this.projectManifestBaseDir, projectPluginSpecificConfigPathRel);
                const projectPluginSpecificAssetsBasePath = path.dirname(projectPluginSpecificConfigPathAbs);
                
                const layer2Data = await this._loadSingleConfigLayer(projectPluginSpecificConfigPathAbs, projectPluginSpecificAssetsBasePath);
                if (layer2Data && layer2Data.rawConfig) {
                    currentMergedConfig = this._deepMerge(currentMergedConfig, layer2Data.rawConfig);
                    if (layer2Data.rawConfig.css_files !== undefined) {
                        if (layer2Data.inherit_css) {
                            currentCssPaths.push(...layer2Data.resolvedCssPaths);
                        } else {
                            currentCssPaths = layer2Data.resolvedCssPaths;
                        }
                    }
                }
            }
        }

        // Finalize: Merge global PDF options from the primaryMainConfig
        if (primaryMainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = this._deepMerge(
                 primaryMainConfig.global_pdf_options, // Base for globals
                 currentMergedConfig.pdf_options || {}  // Plugin's current PDF options become the overrides
            );
             // Ensure the plugin's specific margins (if any) are preserved if they were more specific than global
            if (currentMergedConfig.pdf_options.margin && primaryMainConfig.global_pdf_options.margin) {
                 currentMergedConfig.pdf_options.margin = this._deepMerge(
                    primaryMainConfig.global_pdf_options.margin,
                    currentMergedConfig.pdf_options.margin 
                );
            }
        }
        currentMergedConfig.css_files = [...new Set(currentCssPaths)]; 

        if (!currentMergedConfig.handler_script) {
            throw new Error(`Handler script not specified in effective configuration for plugin '${pluginName}'.`);
        }
        const handlerScriptPath = path.resolve(bundledPluginBasePath, currentMergedConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'. Resolved from bundled plugin path.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: primaryMainConfig, // This is the config used for global settings
            pluginBasePath: bundledPluginBasePath, 
            handlerScriptPath: handlerScriptPath
        };
        
        this.loadedPluginConfigsCache[pluginName] = effectiveDetails;
        return effectiveDetails;
    }
}

module.exports = ConfigResolver;
