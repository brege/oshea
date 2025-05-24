// src/ConfigResolver.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder'); 

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml'; 

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml'); // Standard bundled main config
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml'); // True factory defaults

        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli;
        this.projectManifestConfig = null; 
        this.projectManifestBaseDir = this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        this.primaryMainConfig = null;
        this.primaryMainConfigPathActual = null;
        this.mergedPluginRegistry = null; 

        this.loadedPluginConfigsCache = {};
        this._rawPluginYamlCache = {};
        this._lastEffectiveConfigSources = null;
    }

    async _initializeResolverIfNeeded() {
        let needsRegistryBuild = this.mergedPluginRegistry === null;

        if (this.primaryMainConfig === null) {
            let configPathToLoad;
            let loadedFromReason = "";

            if (this.useFactoryDefaultsOnly) {
                configPathToLoad = this.factoryDefaultMainConfigPath;
                loadedFromReason = `factory default source (${path.basename(this.factoryDefaultMainConfigPath)})`;
                if (!fs.existsSync(configPathToLoad)) {
                    console.error(`CRITICAL: Factory default configuration file '${configPathToLoad}' not found. This file is essential for --factory-defaults mode.`);
                    this.primaryMainConfig = {}; // Proceed with empty config
                    this.primaryMainConfigPathActual = null;
                }
            } else if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                configPathToLoad = this.projectManifestConfigPath;
                loadedFromReason = "project (from --config)";
            } else if (fs.existsSync(this.xdgGlobalConfigPath)) {
                configPathToLoad = this.xdgGlobalConfigPath;
                loadedFromReason = "XDG global";
            } else {
                // Try project root config.yaml first as the "bundled" main if user created it
                if (fs.existsSync(this.defaultMainConfigPath)) {
                    configPathToLoad = this.defaultMainConfigPath;
                    loadedFromReason = `bundled main (${path.basename(this.defaultMainConfigPath)})`;
                } else {
                    // If projectRoot/config.yaml doesn't exist, fall back to config.example.yaml
                    console.warn(`WARN: Main config file '${this.defaultMainConfigPath}' not found. Using factory defaults '${this.factoryDefaultMainConfigPath}' as a last resort.`);
                    configPathToLoad = this.factoryDefaultMainConfigPath;
                    loadedFromReason = `factory default source (${path.basename(this.factoryDefaultMainConfigPath)}) (as fallback)`;
                    if (!fs.existsSync(configPathToLoad)) {
                        console.error(`CRITICAL: Fallback factory default configuration file '${configPathToLoad}' also not found.`);
                        this.primaryMainConfig = {};
                        this.primaryMainConfigPathActual = null;
                    }
                }
            }
            
            if (this.primaryMainConfig === null && configPathToLoad && fs.existsSync(configPathToLoad)) {
                try {
                    console.log(`INFO: Loading primary main configuration from: ${configPathToLoad} (${loadedFromReason})`);
                    this.primaryMainConfig = await loadYamlConfig(configPathToLoad);
                    this.primaryMainConfigPathActual = configPathToLoad;
                    if (configPathToLoad === this.projectManifestConfigPath) {
                        this.projectManifestConfig = this.primaryMainConfig;
                    }
                } catch (error) {
                    console.error(`ERROR loading primary main configuration from '${configPathToLoad}': ${error.message}`);
                    // Fallback to an empty config if any error occurs during load
                    this.primaryMainConfig = {};
                    this.primaryMainConfigPathActual = null;
                }
            } else if (this.primaryMainConfig === null) { // If no valid path was determined or it didn't exist
                 this.primaryMainConfig = {};
                 this.primaryMainConfigPathActual = null;
                 if (configPathToLoad) { // Only warn if we attempted a path
                    console.warn(`WARN: Primary main configuration file '${configPathToLoad}' could not be loaded or found. Using empty global settings.`);
                 } else {
                    console.warn(`WARN: No primary main configuration file could be identified. Using empty global settings.`);
                 }
            }
            this.primaryMainConfig = this.primaryMainConfig || {};
        }

        if (this.mergedPluginRegistry && typeof this.mergedPluginRegistry === 'object' && this.mergedPluginRegistry._builtWithFactoryDefaults !== this.useFactoryDefaultsOnly) {
            needsRegistryBuild = true;
        }

        if (needsRegistryBuild) {
            const registryBuilder = new PluginRegistryBuilder(
                this.projectRoot,
                this.xdgBaseDir,
                this.projectManifestConfigPath,
                this.useFactoryDefaultsOnly
            );
            this.mergedPluginRegistry = await registryBuilder.buildRegistry(); 
            if(this.mergedPluginRegistry) this.mergedPluginRegistry._builtWithFactoryDefaults = this.useFactoryDefaultsOnly;
        }
    }
    
    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources } 
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }

    async _loadProjectManifestConfig() { 
        await this._initializeResolverIfNeeded(); 
    
        if (this.projectManifestConfigPath && 
            this.projectManifestConfigPath !== this.primaryMainConfigPathActual && 
            !this.useFactoryDefaultsOnly && 
            fs.existsSync(this.projectManifestConfigPath)) {
            
            if (this.projectManifestConfig && this.projectManifestConfig._sourcePath === this.projectManifestConfigPath) {
                 return this.projectManifestConfig;
            }
            try {
                this.projectManifestConfig = await loadYamlConfig(this.projectManifestConfigPath);
                if(this.projectManifestConfig) this.projectManifestConfig._sourcePath = this.projectManifestConfigPath; 
            } catch (error) {
                console.warn(`WARN: Could not load additional project manifest from ${this.projectManifestConfigPath} for project overrides: ${error.message}`);
                this.projectManifestConfig = {}; 
            }
        } else if (!this.projectManifestConfigPath) {
             this.projectManifestConfig = null; 
        }
        return this.projectManifestConfig || {}; 
    }
    
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        const cacheKey = `${configFilePath}-${assetsBasePath}`; 
        if (this._rawPluginYamlCache[cacheKey]) {
            return this._rawPluginYamlCache[cacheKey];
        }

        if (!configFilePath || !fs.existsSync(configFilePath)) { 
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
                    const assetPath = path.isAbsolute(cssFile) ? cssFile : path.resolve(assetsBasePath, cssFile);
                    if (!fs.existsSync(assetPath)) {
                        console.warn(`WARN: CSS file not found: ${assetPath} (referenced in ${configFilePath})`);
                        return null;
                    }
                    return assetPath;
                }).filter(Boolean);
            }
            const inherit_css = rawConfig.inherit_css === true; 
            
            const result = { rawConfig, resolvedCssPaths, inherit_css, actualPath: configFilePath }; 
            this._rawPluginYamlCache[cacheKey] = result;
            return result;
        } catch (error) {
            console.error(`ERROR loading plugin configuration layer from '${configFilePath}': ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null };
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
        await this._initializeResolverIfNeeded(); 

        const cacheKey = `${pluginName}-${this.useFactoryDefaultsOnly}`;
        if (this.loadedPluginConfigsCache[cacheKey]) {
            return this.loadedPluginConfigsCache[cacheKey];
        }

        const loadedConfigSourcePaths = {
            mainConfigPath: this.primaryMainConfigPathActual,
            pluginConfigPaths: [], 
            cssFiles: [] 
        };
        const primaryMainConfig = this.primaryMainConfig || {};

        const pluginRegistryEntry = this.mergedPluginRegistry ? this.mergedPluginRegistry[pluginName] : null;

        if (!pluginRegistryEntry || !pluginRegistryEntry.configPath) {
            throw new Error(`Plugin '${pluginName}' is not registered or its configuration path could not be resolved. Registry: ${JSON.stringify(this.mergedPluginRegistry)}. Check document_type_plugins in your main config files.`);
        }
        
        const pluginOwnConfigPath = pluginRegistryEntry.configPath;

        if (!fs.existsSync(pluginOwnConfigPath)) {
            throw new Error(`Configuration file for plugin '${pluginName}' not found at registered path: '${pluginOwnConfigPath}'. This path was found in the merged plugin registry.`);
        }
        const actualPluginBasePath = path.dirname(pluginOwnConfigPath);
        loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);


        const layer0Data = await this._loadSingleConfigLayer(pluginOwnConfigPath, actualPluginBasePath);
        let currentMergedConfig = {};
        let currentCssPaths = [];

        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig;
            currentCssPaths = layer0Data.resolvedCssPaths || [];
        } else {
            throw new Error(`Failed to load plugin's own configuration for '${pluginName}' from '${pluginOwnConfigPath}'.`);
        }

        if (!this.useFactoryDefaultsOnly) {
            const xdgPluginSettingsOverrideFilename = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX; 
            const xdgPluginSettingsOverrideDir = path.join(this.xdgBaseDir, pluginName);
            const xdgPluginSettingsOverridePath = path.join(xdgPluginSettingsOverrideDir, xdgPluginSettingsOverrideFilename); 
            
            if (fs.existsSync(xdgPluginSettingsOverridePath)) {
                const layer1Data = await this._loadSingleConfigLayer(xdgPluginSettingsOverridePath, xdgPluginSettingsOverrideDir);
                if (layer1Data && layer1Data.rawConfig) {
                    currentMergedConfig = this._deepMerge(currentMergedConfig, layer1Data.rawConfig);
                    loadedConfigSourcePaths.pluginConfigPaths.push(xdgPluginSettingsOverridePath);
                    if (layer1Data.rawConfig.css_files !== undefined) {
                        if (layer1Data.inherit_css) {
                            currentCssPaths.push(...layer1Data.resolvedCssPaths);
                        } else {
                            currentCssPaths = layer1Data.resolvedCssPaths;
                        }
                    }
                }
            }
            
            const projectManifest = await this._loadProjectManifestConfig(); 

            if (projectManifest && projectManifest.document_type_plugins) {
                const projectPluginSpecificOverridePathRel = projectManifest.document_type_plugins[pluginName];

                if (typeof projectPluginSpecificOverridePathRel === 'string' && this.projectManifestBaseDir) {
                    let projectPluginSpecificOverridePathAbs = projectPluginSpecificOverridePathRel;
                    if (projectPluginSpecificOverridePathRel.startsWith('~/') || projectPluginSpecificOverridePathRel.startsWith('~\\')) {
                        projectPluginSpecificOverridePathAbs = path.join(os.homedir(), projectPluginSpecificOverridePathRel.substring(2));
                    }
                    if (!path.isAbsolute(projectPluginSpecificOverridePathAbs)) {
                        projectPluginSpecificOverridePathAbs = path.resolve(this.projectManifestBaseDir, projectPluginSpecificOverridePathRel);
                    }
                    
                    if (fs.existsSync(projectPluginSpecificOverridePathAbs)) {
                        if (projectPluginSpecificOverridePathAbs !== pluginOwnConfigPath) {
                            const projectPluginSpecificAssetsBasePath = path.dirname(projectPluginSpecificOverridePathAbs);
                            const layer2Data = await this._loadSingleConfigLayer(projectPluginSpecificOverridePathAbs, projectPluginSpecificAssetsBasePath);
                            
                            if (layer2Data && layer2Data.rawConfig) {
                                currentMergedConfig = this._deepMerge(currentMergedConfig, layer2Data.rawConfig);
                                loadedConfigSourcePaths.pluginConfigPaths.push(projectPluginSpecificOverridePathAbs);
                                if (layer2Data.rawConfig.css_files !== undefined) {
                                    if (layer2Data.inherit_css) {
                                        currentCssPaths.push(...layer2Data.resolvedCssPaths);
                                    } else {
                                        currentCssPaths = layer2Data.resolvedCssPaths;
                                    }
                                }
                            }
                        }
                    } else if (projectPluginSpecificOverridePathRel) {
                         console.warn(`WARN: Project-specific settings override for plugin '${pluginName}' in '${this.projectManifestConfigPath || 'project manifest'}' points to non-existent file: '${projectPluginSpecificOverridePathRel}' (resolved to '${projectPluginSpecificOverridePathAbs || projectPluginSpecificOverridePathRel}')`);
                    }
                } else if (projectPluginSpecificOverridePathRel !== undefined && typeof projectPluginSpecificOverridePathRel !== 'string') {
                    console.warn(`WARN: Invalid path defined for plugin '${pluginName}' settings override in project manifest's document_type_plugins: ${projectPluginSpecificOverridePathRel}`);
                }
            }
        }

        if (primaryMainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = this._deepMerge(
                 primaryMainConfig.global_pdf_options, 
                 currentMergedConfig.pdf_options || {}  
            );
            if (currentMergedConfig.pdf_options && currentMergedConfig.pdf_options.margin && primaryMainConfig.global_pdf_options.margin) {
                 currentMergedConfig.pdf_options.margin = this._deepMerge(
                    primaryMainConfig.global_pdf_options.margin,
                    currentMergedConfig.pdf_options.margin 
                );
            }
        }
        
        const pluginOwnMathConfig = currentMergedConfig.math || {};
        let effectiveMathConfig = primaryMainConfig.math || {};

        effectiveMathConfig = this._deepMerge(effectiveMathConfig, pluginOwnMathConfig);
        
        if ((primaryMainConfig.math && primaryMainConfig.math.katex_options) || (pluginOwnMathConfig && pluginOwnMathConfig.katex_options)) {
            effectiveMathConfig.katex_options = this._deepMerge(
                (primaryMainConfig.math && primaryMainConfig.math.katex_options) || {},
                (pluginOwnMathConfig && pluginOwnMathConfig.katex_options) || {}
            );
        }
        currentMergedConfig.math = effectiveMathConfig;

        currentMergedConfig.css_files = [...new Set(currentCssPaths.filter(p => fs.existsSync(p)))]; 
        loadedConfigSourcePaths.cssFiles = currentMergedConfig.css_files; 

        if (!currentMergedConfig.handler_script) {
            throw new Error(`Handler script not specified in effective configuration for plugin '${pluginName}' (loaded from ${pluginOwnConfigPath}).`);
        }
        
        const handlerScriptPath = path.resolve(actualPluginBasePath, currentMergedConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'. Expected relative to '${actualPluginBasePath}'.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: primaryMainConfig, 
            pluginBasePath: actualPluginBasePath, 
            handlerScriptPath: handlerScriptPath,
            _wasFactoryDefaults: this.useFactoryDefaultsOnly 
        };
        
        this.loadedPluginConfigsCache[cacheKey] = effectiveDetails;
        this._lastEffectiveConfigSources = loadedConfigSourcePaths; 
        return effectiveDetails;
    }
}

module.exports = ConfigResolver;
