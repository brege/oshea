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

        // Check if registry needs rebuild due to factoryDefaults status change
        // or if it was never built.
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
            this.mergedPluginRegistry = await registryBuilder.build();
            // Add a marker to know how it was built, for future checks if factoryDefaults changes
            if(this.mergedPluginRegistry) this.mergedPluginRegistry._builtWithFactoryDefaults = this.useFactoryDefaultsOnly;
        }
    }
    
    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources } 
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }

    async _loadProjectManifestConfig() { 
        // This method ensures this.projectManifestConfig is loaded if a path was given
        // and it wasn't already loaded as the primaryMainConfig.
        // It's used for Layer 2 overrides.
        await this._initializeResolverIfNeeded(); // Ensures primaryMainConfig is attempted first.
    
        // If projectManifestConfigPath was given, but it wasn't the one loaded as primaryMainConfig
        if (this.projectManifestConfigPath && 
            this.projectManifestConfigPath !== this.primaryMainConfigPathActual && 
            !this.useFactoryDefaultsOnly && 
            fs.existsSync(this.projectManifestConfigPath)) {
            
            // Avoid reloading if it was somehow already loaded and matches the path
            if (this.projectManifestConfig && this.projectManifestConfig._sourcePath === this.projectManifestConfigPath) {
                 return this.projectManifestConfig;
            }
            try {
                // console.log(`INFO: Additionally loading project manifest (from --config) for Layer 2 plugin setting overrides: ${this.projectManifestConfigPath}`);
                this.projectManifestConfig = await loadYamlConfig(this.projectManifestConfigPath);
                if(this.projectManifestConfig) this.projectManifestConfig._sourcePath = this.projectManifestConfigPath; // Mark its source for caching
            } catch (error) {
                console.warn(`WARN: Could not load additional project manifest from ${this.projectManifestConfigPath} for project overrides: ${error.message}`);
                this.projectManifestConfig = {}; // Set to empty to avoid repeated attempts
            }
        } else if (this.projectManifestConfigPath === this.primaryMainConfigPathActual) {
            // It *was* the primary, so this.projectManifestConfig should be populated.
            // (Handled by _initializeResolverIfNeeded)
        } else if (!this.projectManifestConfigPath) {
             this.projectManifestConfig = null; // No manifest path provided.
        }
        return this.projectManifestConfig || {}; 
    }
    
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        const cacheKey = `${configFilePath}-${assetsBasePath}`; // Ensure assetsBasePath is part of cache key
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

        // --- Layer 0: Plugin's Own Default Configuration ---
        // Get path from the new mergedPluginRegistry
        const pluginOwnConfigPath = this.mergedPluginRegistry ? this.mergedPluginRegistry[pluginName] : null;

        if (!pluginOwnConfigPath) {
            throw new Error(`Plugin '${pluginName}' is not registered or its configuration path could not be resolved. Registry: ${JSON.stringify(this.mergedPluginRegistry)}. Check document_type_plugins in your main config files.`);
        }
        if (!fs.existsSync(pluginOwnConfigPath)) {
            throw new Error(`Configuration file for plugin '${pluginName}' not found at registered path: '${pluginOwnConfigPath}'. This path was found in the merged plugin registry.`);
        }
        const actualPluginBasePath = path.dirname(pluginOwnConfigPath);
        if (pluginOwnConfigPath) loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);


        const layer0Data = await this._loadSingleConfigLayer(pluginOwnConfigPath, actualPluginBasePath);
        let currentMergedConfig = {};
        let currentCssPaths = [];

        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig;
            currentCssPaths = layer0Data.resolvedCssPaths || [];
        } else {
            // This should ideally be caught by the existsSync check above, but good to have.
            throw new Error(`Failed to load plugin's own configuration for '${pluginName}' from '${pluginOwnConfigPath}'.`);
        }

        // --- Layer 1 & 2: XDG and Project-Specific Setting Overrides ---
        if (!this.useFactoryDefaultsOnly) {
            // Layer 1: XDG User Defaults for the specific plugin's settings
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
            
            // Layer 2: Project-Specific Settings Override for the specific plugin
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
