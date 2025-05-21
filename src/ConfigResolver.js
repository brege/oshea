// src/ConfigResolver.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder'); // Require the new module

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml'; // Used for XDG/Project override file names

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');

        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli;
        this.projectManifestConfig = null; // To store the loaded project manifest content if --config is used
        this.projectManifestBaseDir = this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        this.primaryMainConfig = null;
        this.primaryMainConfigPathActual = null;
        this.mergedPluginRegistry = null; // Will be set by _initializeResolverIfNeeded

        this.loadedPluginConfigsCache = {};
        this._rawPluginYamlCache = {};
        this._lastEffectiveConfigSources = null;
    }

    async _initializeResolverIfNeeded() {
        let needsRegistryBuild = this.mergedPluginRegistry === null;

        if (this.primaryMainConfig === null) {
            let configPathToLoad = this.defaultMainConfigPath;
            let loadedFrom = "bundled default";

            if (this.useFactoryDefaultsOnly) {
                configPathToLoad = this.defaultMainConfigPath;
                loadedFrom = "bundled default (due to --factory-defaults)";
            } else if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                configPathToLoad = this.projectManifestConfigPath;
                loadedFrom = "project (from --config)";
            } else if (fs.existsSync(this.xdgGlobalConfigPath)) {
                configPathToLoad = this.xdgGlobalConfigPath;
                loadedFrom = "XDG global";
            } else if (!fs.existsSync(this.defaultMainConfigPath)) {
                console.warn(`WARN: Default main configuration file '${this.defaultMainConfigPath}' not found. Using empty config for global settings.`);
                this.primaryMainConfig = {};
                this.primaryMainConfigPathActual = null;
                if (configPathToLoad === this.projectManifestConfigPath) {
                    this.projectManifestConfig = this.primaryMainConfig;
                }
            }
            
            if (this.primaryMainConfig === null) {
                try {
                    console.log(`INFO: Loading primary main configuration from: ${configPathToLoad} (${loadedFrom})`);
                    this.primaryMainConfig = await loadYamlConfig(configPathToLoad);
                    this.primaryMainConfigPathActual = configPathToLoad;
                    if (configPathToLoad === this.projectManifestConfigPath) {
                        // If the project manifest was loaded as the primary, store its content.
                        this.projectManifestConfig = this.primaryMainConfig;
                    }
                } catch (error) {
                    console.error(`ERROR loading primary main configuration from '${configPathToLoad}': ${error.message}`);
                    if (configPathToLoad !== this.defaultMainConfigPath && !this.useFactoryDefaultsOnly && fs.existsSync(this.defaultMainConfigPath)) {
                        console.warn(`WARN: Falling back to bundled default main configuration: ${this.defaultMainConfigPath}`);
                        try {
                            this.primaryMainConfig = await loadYamlConfig(this.defaultMainConfigPath);
                            this.primaryMainConfigPathActual = this.defaultMainConfigPath;
                        } catch (fallbackError) {
                            console.error(`ERROR loading fallback bundled default main configuration: ${fallbackError.message}`);
                            this.primaryMainConfig = {};
                            this.primaryMainConfigPathActual = null;
                        }
                    } else {
                        this.primaryMainConfig = {};
                        this.primaryMainConfigPathActual = null;
                    }
                    if (configPathToLoad === this.projectManifestConfigPath) {
                        this.projectManifestConfig = this.primaryMainConfig; // Ensure it's set even on error
                    }
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
            // Corrected method call: buildRegistry() instead of build()
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
        
        const pluginOwnMathRendering = currentMergedConfig.math_rendering || {}; 
        let effectiveMathRenderingConfig = primaryMainConfig.math_rendering || {}; 

        effectiveMathRenderingConfig = this._deepMerge(effectiveMathRenderingConfig, pluginOwnMathRendering);
        
        if ((primaryMainConfig.math_rendering && primaryMainConfig.math_rendering.katex_options) || (pluginOwnMathRendering && pluginOwnMathRendering.katex_options)) {
            effectiveMathRenderingConfig.katex_options = this._deepMerge(
                (primaryMainConfig.math_rendering && primaryMainConfig.math_rendering.katex_options) || {},
                (pluginOwnMathRendering && pluginOwnMathRendering.katex_options) || {}
            );
        }
        currentMergedConfig.math_rendering = effectiveMathRenderingConfig;

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
