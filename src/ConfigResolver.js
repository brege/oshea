// src/ConfigResolver.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const Ajv = require('ajv');
const { loadYamlConfig, deepMerge } = require('./config_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder');
const MainConfigLoader = require('./main_config_loader');
const PluginConfigLoader = require('./plugin_config_loader');
const AssetResolver = require('./asset_resolver');

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false, isLazyLoadMode = false, dependencies = {}) {
        // --- REFACTOR: Define and merge dependencies ---
        const defaultDependencies = {
            fs, path, os,
            loadYamlConfig, deepMerge,
            PluginRegistryBuilder, MainConfigLoader, PluginConfigLoader, AssetResolver
        };
        this.dependencies = { ...defaultDependencies, ...dependencies };
        
        // --- Original constructor logic, with dependencies injected ---
        this.projectRoot = this.dependencies.path.resolve(__dirname, '..');
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
        this.isLazyLoadMode = isLazyLoadMode;

        this.mainConfigLoader = new this.dependencies.MainConfigLoader(
            this.projectRoot,
            mainConfigPathFromCli,
            this.useFactoryDefaultsOnly
        );
        this.pluginConfigLoader = null;
        this.mergedPluginRegistry = null;
        this._lastProjectManifestPathForRegistry = mainConfigPathFromCli;
        this.loadedPluginConfigsCache = {};
        this._lastEffectiveConfigSources = null;
        this._initialized = false;
        this.primaryMainConfig = null;
        this.primaryMainConfigPathActual = null;
        this.primaryMainConfigLoadReason = null;
        this.resolvedCollRoot = null;

        this.ajv = new Ajv({ allErrors: true });
        const baseSchemaPath = this.dependencies.path.join(this.projectRoot, 'src', 'base-plugin.schema.json');
        if (this.dependencies.fs.existsSync(baseSchemaPath)) {
            const baseSchema = JSON.parse(this.dependencies.fs.readFileSync(baseSchemaPath, 'utf8'));
            this.ajv.addSchema(baseSchema, 'base-plugin.schema.json');
        } else {
            console.error("CRITICAL: Base plugin schema not found. Validation will not work.");
        }
    }

    _validatePluginConfig(pluginName, configData, pluginConfigPath) {
        const baseSchema = this.ajv.getSchema('base-plugin.schema.json').schema;
        let specificSchema = {};
        const pluginSchemaPath = this.dependencies.path.join(this.dependencies.path.dirname(pluginConfigPath), `${this.dependencies.path.basename(pluginConfigPath, '.config.yaml')}.schema.json`);
    
        if (this.dependencies.fs.existsSync(pluginSchemaPath)) {
            try {
                specificSchema = JSON.parse(this.dependencies.fs.readFileSync(pluginSchemaPath, 'utf8'));
            } catch (e) {
                console.warn(`WARN: Could not read or parse schema file at ${pluginSchemaPath}. Error: ${e.message}`);
            }
        }
    
        // Create a strict version of the schema for typo-checking
        const strictSchema = this.dependencies.deepMerge(baseSchema, specificSchema);
        
        // Safely set additionalProperties to false for all defined objects
        const objectsToRestrict = ['pdf_options', 'params', 'math', 'toc_options'];
        if (strictSchema.properties) {
            objectsToRestrict.forEach(key => {
                if (strictSchema.properties[key] && strictSchema.properties[key].type === 'object') {
                    strictSchema.properties[key].additionalProperties = false;
                }
            });
        }
    
        const validate = this.ajv.compile(strictSchema);
        const isValid = validate(configData);
    
        if (!isValid) {
            const typoErrors = validate.errors.filter(e => e.keyword === 'additionalProperties');
            const otherErrors = validate.errors.filter(e => e.keyword !== 'additionalProperties');

            if (typoErrors.length > 0) {
                console.warn(`WARN: Configuration for plugin '${pluginName}' has possible typos or unknown properties:`);
                typoErrors.forEach(err => {
                    const property = err.params.additionalProperty;
                    const path = err.instancePath ? `${err.instancePath.substring(1)}.${property}`.replace(/\//g, '.') : property;
                    console.warn(`  - Unknown property '${path}' found in '${pluginConfigPath}'.`);
                });
                console.warn(`  INFO: To see the final applied settings, run 'md-to-pdf config --plugin ${pluginName}'`);
            }
            
            if (otherErrors.length > 0) {
                console.warn(`WARN: Configuration for plugin '${pluginName}' has validation errors:`);
                otherErrors.forEach(err => {
                    console.warn(`  - Path '${err.instancePath || '/'}': ${err.message}`);
                });
            }
        }
    }


    async _initializeResolverIfNeeded() {
        // REMOVED: if (this._initialized) return;

        const primary = await this.mainConfigLoader.getPrimaryMainConfig();
        this.primaryMainConfig = primary.config;
        this.primaryMainConfigPathActual = primary.path;
        this.primaryMainConfigLoadReason = primary.reason;

        const xdg = await this.mainConfigLoader.getXdgMainConfig();
        const project = await this.mainConfigLoader.getProjectManifestConfig();

        this.resolvedCollRoot = this.primaryMainConfig.collections_root || null;

        this.pluginConfigLoader = new this.dependencies.PluginConfigLoader(
            xdg.baseDir, xdg.config, xdg.path,
            project.baseDir, project.config, project.path,
            this.useFactoryDefaultsOnly
        );

        const currentProjectManifestPath = project.path;
        let needsRegistryBuild = this.mergedPluginRegistry === null ||
                                 (this.mergedPluginRegistry._builtWithFactoryDefaults !== this.useFactoryDefaultsOnly) ||
                                 (this._lastProjectManifestPathForRegistry !== currentProjectManifestPath) ||
                                 (this.mergedPluginRegistry.isLazyLoadMode !== this.isLazyLoadMode) ||
                                 (this.mergedPluginRegistry.primaryMainConfigLoadReason !== this.primaryMainConfigLoadReason);

        if (needsRegistryBuild) {
            if (process.env.DEBUG) {
                console.log(`DEBUG (ConfigResolver): Rebuilding plugin registry. ProjectManifestPath: ${currentProjectManifestPath}, FactoryDefaults: ${this.useFactoryDefaultsOnly}, LazyLoad: ${this.isLazyLoadMode}, PrimaryLoadReason: ${this.primaryMainConfigLoadReason}`);
            }
            const registryBuilder = new this.dependencies.PluginRegistryBuilder(
                this.projectRoot, xdg.baseDir, currentProjectManifestPath,
                this.useFactoryDefaultsOnly,
                this.isLazyLoadMode,
                this.primaryMainConfigLoadReason
            );
            this.mergedPluginRegistry = await registryBuilder.buildRegistry();
            if (this.mergedPluginRegistry) {
                this.mergedPluginRegistry._builtWithFactoryDefaults = this.useFactoryDefaultsOnly;
                this.mergedPluginRegistry.isLazyLoadMode = this.isLazyLoadMode;
                this.mergedPluginRegistry.primaryMainConfigLoadReason = this.primaryMainConfigLoadReason;
            }
            this._lastProjectManifestPathForRegistry = currentProjectManifestPath;
        }
        this._initialized = true;

        if (process.env.DEBUG) {
            console.log("DEBUG (ConfigResolver): Resolved Collections Root:", this.resolvedCollRoot);
        }
    }

    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources }
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }

    async _loadPluginBaseConfig(configFilePath, assetsBasePath, pluginName) {
        if (!this.pluginConfigLoader) {
            throw new Error("PluginConfigLoader not initialized in ConfigResolver.");
        }
        const cacheKey = `base-${configFilePath}-${assetsBasePath}`;
        if (this.pluginConfigLoader._rawPluginYamlCache[cacheKey]) {
            return this.pluginConfigLoader._rawPluginYamlCache[cacheKey];
        }
        if (!configFilePath || !this.dependencies.fs.existsSync(configFilePath)) {
            console.warn(`WARN (ConfigResolver): Base config file path not provided or does not exist: ${configFilePath} for plugin ${pluginName}.`);
            return null;
        }
        try {
            const rawConfig = await this.dependencies.loadYamlConfig(configFilePath);
            
            // --- NEW: Perform validation after loading the raw config ---
            this._validatePluginConfig(pluginName, rawConfig, configFilePath);
            
            const initialCssPaths = this.dependencies.AssetResolver.resolveAndMergeCss(
                rawConfig.css_files, assetsBasePath, [], false,
                pluginName, configFilePath
            );
            const inherit_css = rawConfig.inherit_css === true;
            const result = { rawConfig, resolvedCssPaths: initialCssPaths, inherit_css, actualPath: configFilePath };
            this.pluginConfigLoader._rawPluginYamlCache[cacheKey] = result;
            return result;
        } catch (error) {
            console.error(`ERROR (ConfigResolver): loading plugin base configuration from '${configFilePath}' for ${pluginName}: ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null };
        }
    }

    async getEffectiveConfig(pluginSpec, localConfigOverrides = null, markdownFilePath = null) {
        await this._initializeResolverIfNeeded();

        const isPathSpec = typeof pluginSpec === 'string' && (pluginSpec.includes(this.dependencies.path.sep) || pluginSpec.startsWith('.'));
        let nominalPluginNameForLookup;
        let pluginOwnConfigPath;
        let actualPluginBasePath;

        if (isPathSpec) {
            let resolvedPathSpec = pluginSpec;
            if (!this.dependencies.path.isAbsolute(resolvedPathSpec)) {
                if (resolvedPathSpec.startsWith('~/') || resolvedPathSpec.startsWith('~\\')) {
                    resolvedPathSpec = this.dependencies.path.join(this.dependencies.os.homedir(), resolvedPathSpec.substring(2));
                } else {
                    if (markdownFilePath && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
                        console.warn(`WARN (ConfigResolver): Plugin path spec '${pluginSpec}' is relative. Resolving from CWD. It should ideally be absolute if from front matter or local config.`);
                        resolvedPathSpec = this.dependencies.path.resolve(pluginSpec);
                    } else if (!this.dependencies.path.isAbsolute(resolvedPathSpec)) {
                        throw new Error(`Relative plugin path specification '${pluginSpec}' must be resolved to an absolute path before calling getEffectiveConfig if not from CLI CWD, or use a registered plugin name.`);
                    }
                }
            }
            if (!this.dependencies.fs.existsSync(resolvedPathSpec)) {
                throw new Error(`Plugin configuration file or directory specified by path not found: '${resolvedPathSpec}'.`);
            }
            const stats = this.dependencies.fs.statSync(resolvedPathSpec);
            if (stats.isDirectory()) {
                actualPluginBasePath = resolvedPathSpec;
                const dirName = this.dependencies.path.basename(actualPluginBasePath);
                pluginOwnConfigPath = this.dependencies.path.join(actualPluginBasePath, `${dirName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
                nominalPluginNameForLookup = dirName;
                if (!this.dependencies.fs.existsSync(pluginOwnConfigPath)) {
                    const filesInDir = this.dependencies.fs.readdirSync(actualPluginBasePath);
                    const alternativeConfig = filesInDir.find(f => f.endsWith(PLUGIN_CONFIG_FILENAME_SUFFIX));
                    if (alternativeConfig) {
                        pluginOwnConfigPath = this.dependencies.path.join(actualPluginBasePath, alternativeConfig);
                    } else {
                        throw new Error(`Plugin directory '${actualPluginBasePath}' specified, but no *.config.yaml file found within it.`);
                    }
                }
            } else if (stats.isFile()) {
                pluginOwnConfigPath = resolvedPathSpec;
                actualPluginBasePath = this.dependencies.path.dirname(pluginOwnConfigPath);
                nominalPluginNameForLookup = this.dependencies.path.basename(actualPluginBasePath);
            } else {
                throw new Error(`Plugin path specification '${resolvedPathSpec}' is neither a file nor a directory.`);
            }
            if (!this.isLazyLoadMode || process.env.DEBUG) {
                console.log(`INFO (ConfigResolver): Loading plugin from path: ${pluginOwnConfigPath}. Nominal name for overrides: '${nominalPluginNameForLookup}'.`);
            }
        } else {
            nominalPluginNameForLookup = pluginSpec;
            const pluginRegistryEntry = this.mergedPluginRegistry ? this.mergedPluginRegistry[nominalPluginNameForLookup] : null;
            if (!pluginRegistryEntry || !pluginRegistryEntry.configPath) {
                throw new Error(`Plugin '${nominalPluginNameForLookup}' is not registered or its configuration path could not be resolved.`);
            }
            pluginOwnConfigPath = pluginRegistryEntry.configPath;
            if (!this.dependencies.fs.existsSync(pluginOwnConfigPath)) {
                throw new Error(`Configuration file for plugin '${nominalPluginNameForLookup}' not found at registered path: '${pluginOwnConfigPath}'.`);
            }
            actualPluginBasePath = this.dependencies.path.dirname(pluginOwnConfigPath);
        }

        const localOverridesCacheKeyPart = localConfigOverrides ? JSON.stringify(localConfigOverrides) : 'noLocalOverrides';
        const markdownFilePathCacheKeyPart = markdownFilePath || 'noMarkdownFile';
        const cacheKey = `${nominalPluginNameForLookup}-${isPathSpec ? 'pathspec' : 'namespec'}-${pluginOwnConfigPath}-${this.useFactoryDefaultsOnly}-${this.primaryMainConfigPathActual}-${localOverridesCacheKeyPart}-${markdownFilePathCacheKeyPart}`;

        if (this.loadedPluginConfigsCache[cacheKey]) {
            return this.loadedPluginConfigsCache[cacheKey];
        }

        const loadedConfigSourcePaths = {
            mainConfigPath: this.primaryMainConfigPathActual,
            pluginConfigPaths: [],
            cssFiles: []
        };

        const layer0Data = await this._loadPluginBaseConfig(pluginOwnConfigPath, actualPluginBasePath, nominalPluginNameForLookup);
        if (!layer0Data || !layer0Data.rawConfig) {
            throw new Error(`Failed to load plugin's own base configuration for '${nominalPluginNameForLookup}' from '${pluginOwnConfigPath}'.`);
        }
        loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);

        const originalHandlerScript = layer0Data.rawConfig.handler_script;
        if (!originalHandlerScript) {
            throw new Error(`'handler_script' not defined in plugin '${nominalPluginNameForLookup}'s own configuration file: ${pluginOwnConfigPath}`);
        }

        const {
            mergedConfig: configAfterXLPOlayers,
            mergedCssPaths: cssAfterXLPOlayers
        } = await this.pluginConfigLoader.applyOverrideLayers(
            nominalPluginNameForLookup, layer0Data, loadedConfigSourcePaths.pluginConfigPaths
        );

        let currentMergedConfig = configAfterXLPOlayers;
        let currentCssPaths = cssAfterXLPOlayers;

        if (localConfigOverrides && Object.keys(localConfigOverrides).length > 0) {
            if (process.env.DEBUG) {
                console.log(`DEBUG (ConfigResolver): Applying localConfigOverrides for ${nominalPluginNameForLookup}:`, JSON.stringify(localConfigOverrides));
            }
            currentMergedConfig = this.dependencies.deepMerge(currentMergedConfig, localConfigOverrides);

            if (localConfigOverrides.css_files && markdownFilePath) {
                const localConfigDir = this.dependencies.path.dirname(markdownFilePath);
                currentCssPaths = this.dependencies.AssetResolver.resolveAndMergeCss(
                    localConfigOverrides.css_files,
                    localConfigDir,
                    currentCssPaths,
                    localConfigOverrides.inherit_css === true,
                    nominalPluginNameForLookup,
                    `${this.dependencies.path.basename(markdownFilePath, this.dependencies.path.extname(markdownFilePath))}.config.yaml`
                );
            }
            const localConfigFilenameForLog = markdownFilePath ? `${this.dependencies.path.basename(markdownFilePath, this.dependencies.path.extname(markdownFilePath))}.config.yaml` : "<filename>.config.yaml";
            loadedConfigSourcePaths.pluginConfigPaths.push(`Local file override from '${localConfigFilenameForLog}'`);
        }

        currentMergedConfig.handler_script = originalHandlerScript;

        if (this.primaryMainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = this.dependencies.deepMerge(
                this.primaryMainConfig.global_pdf_options,
                currentMergedConfig.pdf_options || {}
            );
            if (this.primaryMainConfig.global_pdf_options.margin && (currentMergedConfig.pdf_options || {}).margin) {
                currentMergedConfig.pdf_options.margin = this.dependencies.deepMerge(
                    this.primaryMainConfig.global_pdf_options.margin,
                    currentMergedConfig.pdf_options.margin
                );
            }
        }

        const pluginOwnMathConfig = currentMergedConfig.math || {};
        let effectiveMathConfig = this.primaryMainConfig.math || {};
        effectiveMathConfig = this.dependencies.deepMerge(effectiveMathConfig, pluginOwnMathConfig);
        if ((this.primaryMainConfig.math && this.primaryMainConfig.math.katex_options) || (pluginOwnMathConfig.katex_options)) {
            effectiveMathConfig.katex_options = this.dependencies.deepMerge(
                (this.primaryMainConfig.math && this.primaryMainConfig.math.katex_options) || {},
                pluginOwnMathConfig.katex_options || {}
            );
        }
        currentMergedConfig.math = effectiveMathConfig;

        currentMergedConfig.css_files = [...new Set(currentCssPaths.filter(p => p && this.dependencies.fs.existsSync(p)))];
        loadedConfigSourcePaths.cssFiles = currentMergedConfig.css_files;

        const handlerScriptPath = this.dependencies.path.resolve(actualPluginBasePath, currentMergedConfig.handler_script);
        if (!this.dependencies.fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${nominalPluginNameForLookup}'.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: this.primaryMainConfig,
            pluginBasePath: actualPluginBasePath,
            handlerScriptPath: handlerScriptPath,
            _wasFactoryDefaults: this.useFactoryDefaultsOnly
        };

        this.loadedPluginConfigsCache[cacheKey] = effectiveDetails;
        this._lastEffectiveConfigSources = loadedConfigSourcePaths;
        return effectiveDetails;
    }

    async getResolvedCollRoot() {
        await this._initializeResolverIfNeeded();
        return this.resolvedCollRoot;
    }
}

module.exports = ConfigResolver;
