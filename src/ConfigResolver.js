// src/ConfigResolver.js
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');

        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli;
        this.projectManifestConfig = null; // Will be loaded by _loadAndSetPrimaryMainConfig if it's the chosen one
        this.projectManifestBaseDir = this.projectManifestConfigPath ? path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        // Initialize properties that will be set by _initializeResolverIfNeeded
        this.primaryMainConfig = null;
        this.primaryMainConfigPathActual = null;
        this.mergedPluginRegistry = {}; // For future steps, initialized here

        this.loadedPluginConfigsCache = {};
        this._rawPluginYamlCache = {};
        this._lastEffectiveConfigSources = null;
    }

    async _initializeResolverIfNeeded() {
        // If primaryMainConfig is already loaded, we assume initialization is complete for this step's scope.
        // In later steps, we might check this.mergedPluginRegistry too.
        if (this.primaryMainConfig !== null) {
            return;
        }

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
             // If this is the project manifest path, also set this.projectManifestConfig
             if (configPathToLoad === this.projectManifestConfigPath) {
                this.projectManifestConfig = this.primaryMainConfig;
             }
             return; // Exit after setting empty config
        }
        
        try {
            console.log(`INFO: Loading primary main configuration from: ${configPathToLoad} (${loadedFrom})`);
            this.primaryMainConfig = await loadYamlConfig(configPathToLoad);
            this.primaryMainConfigPathActual = configPathToLoad; 
            // If the loaded config was the project manifest, store it in this.projectManifestConfig too
            if (configPathToLoad === this.projectManifestConfigPath) {
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
                    this.primaryMainConfig = {}; // Ensure it's an object on error
                    this.primaryMainConfigPathActual = null;
                }
            } else {
                this.primaryMainConfig = {}; // Ensure it's an object on error
                this.primaryMainConfigPathActual = null;
            }
             // If this was the project manifest path and it failed, ensure projectManifestConfig is also empty
            if (configPathToLoad === this.projectManifestConfigPath) {
                this.projectManifestConfig = this.primaryMainConfig;
            }
        }
    }

    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources } 
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }

    async _loadProjectManifestConfig() { 
        // This method's original purpose was to load the manifest if --config was given.
        // Now, _initializeResolverIfNeeded handles loading the primary main config, which *could* be the project manifest.
        // If the project manifest was indeed loaded as the primary, this.projectManifestConfig will be set.
        // If it wasn't (e.g. XDG was primary), but --config was still specified, we might need to load it
        // separately if it contains project-specific plugin *setting* overrides (not registrations, for now).
        // For this current refactoring step, we ensure it's loaded if it *was* the primary.
        // The more complex logic for separate loading if not primary will be for when we use its document_type_plugins.

        await this._initializeResolverIfNeeded(); // Ensure primary (which could be manifest) is loaded.
        
        // If manifestConfigPath was provided, but it wasn't loaded as primary,
        // and we're not in factory defaults, we might still need its content later.
        // For now, this._initializeResolverIfNeeded already populates this.projectManifestConfig if it was the one loaded.
        if (this.projectManifestConfigPath && !this.projectManifestConfig && !this.useFactoryDefaultsOnly) {
             if (fs.existsSync(this.projectManifestConfigPath)) {
                try {
                    // This load is specifically if the project manifest was NOT the primary one chosen
                    // (e.g., XDG global was primary, but --config project_manifest.yaml was also supplied)
                    // We might need it for specific project-level plugin *setting* overrides later.
                    console.log(`INFO: Additionally loading project manifest (from --config) for potential overrides: ${this.projectManifestConfigPath}`);
                    this.projectManifestConfig = await loadYamlConfig(this.projectManifestConfigPath);
                } catch (error) {
                    console.warn(`WARN: Could not load additional project manifest from ${this.projectManifestConfigPath}: ${error.message}`);
                    this.projectManifestConfig = {}; // Set to empty if fails
                }
            } else if (this.projectManifestConfigPath === this.primaryMainConfigPathActual) {
                // It was the primary, so it's already in this.projectManifestConfig (set by _initializeResolverIfNeeded)
            } else {
                 // --config was given, but file doesn't exist, and it wasn't the primary.
                 // This case should be rare if _initializeResolverIfNeeded already ran.
                 this.projectManifestConfig = {};
            }
        } else if (!this.projectManifestConfigPath) {
            this.projectManifestConfig = null; // No manifest path provided
        }
        
        return this.projectManifestConfig || {}; // Return loaded or empty object
    }
    
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        if (this._rawPluginYamlCache[configFilePath]) {
            return this._rawPluginYamlCache[configFilePath];
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
            this._rawPluginYamlCache[configFilePath] = result;
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
        await this._initializeResolverIfNeeded(); // Ensures primaryMainConfig is loaded

        // Cache check (remains the same for now)
        if (this.loadedPluginConfigsCache[pluginName] && this.loadedPluginConfigsCache[pluginName]._wasFactoryDefaults === this.useFactoryDefaultsOnly) {
            return this.loadedPluginConfigsCache[pluginName];
        }

        const loadedConfigSourcePaths = {
            mainConfigPath: this.primaryMainConfigPathActual,
            pluginConfigPaths: [], 
            cssFiles: [] 
        };

        // Ensure primaryMainConfig is an object, even if loading failed
        const primaryMainConfig = this.primaryMainConfig || {}; 

        // --- Layer 0: Bundled Plugin Defaults ---
        // THIS SECTION WILL CHANGE SIGNIFICANTLY in the next step to use this.mergedPluginRegistry
        // For now, it uses the existing logic (assuming bundled plugins)
        const bundledPluginConfigFileName = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX;
        const bundledPluginDir = path.join(this.projectRoot, 'plugins', pluginName); // Existing assumption
        const bundledPluginConfigPath = path.join(bundledPluginDir, bundledPluginConfigFileName);
        
        const layer0Data = await this._loadSingleConfigLayer(bundledPluginConfigPath, bundledPluginDir);
        let currentMergedConfig = {};
        let currentCssPaths = [];

        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig;
            currentCssPaths = layer0Data.resolvedCssPaths || [];
            if (layer0Data.actualPath) loadedConfigSourcePaths.pluginConfigPaths.push(layer0Data.actualPath);
        } else {
            throw new Error(`Bundled configuration for plugin '${pluginName}' not found at '${bundledPluginConfigPath}'.`);
        }
        const currentActualPluginBasePath = bundledPluginDir; // Will change in next step

        // --- Layer 1 & 2: XDG and Project-Specific Overrides ---
        // This logic remains structurally similar but will apply over the (potentially non-bundled) Layer 0 in future.
        if (!this.useFactoryDefaultsOnly) {
            // Layer 1: XDG User Defaults for the specific plugin
            const xdgPluginConfigFileName = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX; 
            const xdgPluginDir = path.join(this.xdgBaseDir, pluginName);
            const xdgPluginConfigPath = path.join(xdgPluginDir, xdgPluginConfigFileName); 
            
            const layer1Data = await this._loadSingleConfigLayer(xdgPluginConfigPath, xdgPluginDir);
            if (layer1Data && layer1Data.rawConfig) {
                currentMergedConfig = this._deepMerge(currentMergedConfig, layer1Data.rawConfig);
                if (fs.existsSync(xdgPluginConfigPath)) { // Only add if it was actually loaded
                    loadedConfigSourcePaths.pluginConfigPaths.push(xdgPluginConfigPath);
                }
                if (layer1Data.rawConfig.css_files !== undefined) {
                    if (layer1Data.inherit_css) {
                        currentCssPaths.push(...layer1Data.resolvedCssPaths);
                    } else {
                        currentCssPaths = layer1Data.resolvedCssPaths;
                    }
                }
            }
            
            // Layer 2: Project-Specific Config for the specific plugin (from --config)
            const projectManifest = await this._loadProjectManifestConfig(); // Ensures project manifest is loaded if available

            if (projectManifest && projectManifest.document_type_plugins) {
                const projectPluginSpecificOverridePathRel = projectManifest.document_type_plugins[pluginName];

                if (projectPluginSpecificOverridePathRel && this.projectManifestBaseDir) {
                    // Resolve path relative to the project manifest's directory
                    const projectPluginSpecificOverridePathAbs = path.isAbsolute(projectPluginSpecificOverridePathRel)
                        ? projectPluginSpecificOverridePathRel
                        : path.resolve(this.projectManifestBaseDir, projectPluginSpecificOverridePathRel);

                    if (fs.existsSync(projectPluginSpecificOverridePathAbs)) {
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
                    } else if (projectPluginSpecificOverridePathRel) {
                         console.warn(`WARN: Project-specific override for plugin '${pluginName}' in '${this.projectManifestConfigPath || 'project manifest'}' points to non-existent file: '${projectPluginSpecificOverridePathRel}' (resolved to '${projectPluginSpecificOverridePathAbs}')`);
                    }
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
            throw new Error(`Handler script not specified in effective configuration for plugin '${pluginName}'.`);
        }
        
        const handlerScriptPath = path.resolve(currentActualPluginBasePath, currentMergedConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'. Expected relative to '${currentActualPluginBasePath}'.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: primaryMainConfig, 
            pluginBasePath: currentActualPluginBasePath, // This will change when registry is used
            handlerScriptPath: handlerScriptPath,
            _wasFactoryDefaults: this.useFactoryDefaultsOnly 
        };
        
        this.loadedPluginConfigsCache[pluginName] = effectiveDetails;
        this._lastEffectiveConfigSources = loadedConfigSourcePaths; 
        return effectiveDetails;
    }
}

module.exports = ConfigResolver;
