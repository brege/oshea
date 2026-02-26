// src/config/config-resolver.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Ajv = require('ajv');
const {
  configUtilsPath,
  pluginRegistryBuilderPath,
  mainConfigLoaderPath,
  pluginConfigLoaderPath,
  assetResolverPath,
  basePluginSchemaPath,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);
const { loadYamlConfig, deepMerge } = require(configUtilsPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const MainConfigLoader = require(mainConfigLoaderPath);
const PluginConfigLoader = require(pluginConfigLoaderPath);
const AssetResolver = require(assetResolverPath);

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class ConfigResolver {
  constructor(
    mainConfigPathFromCli,
    useFactoryDefaultsOnly = false,
    isLazyLoadMode = false,
    dependencies = {},
  ) {
    const defaultDependencies = {
      fs,
      path,
      os,
      loadYamlConfig,
      deepMerge,
      PluginRegistryBuilder,
      MainConfigLoader,
      PluginConfigLoader,
      AssetResolver,
    };
    this.dependencies = { ...defaultDependencies, ...dependencies };
    this.pluginInstaller = dependencies.pluginInstaller || null;

    this.projectRoot = require('@paths').projectRoot;
    this._useFactoryDefaultsOnly = useFactoryDefaultsOnly;
    this._isLazyLoadMode = isLazyLoadMode;

    this.mainConfigLoader = new this.dependencies.MainConfigLoader(
      this.projectRoot,
      mainConfigPathFromCli,
      this._useFactoryDefaultsOnly,
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

    this.resolvedPluginsRoot = this.dependencies.pluginsRoot || null;

    this.ajv = new Ajv({ allErrors: true });
    // Use the direct, canonical path from the registry
    if (this.dependencies.fs.existsSync(basePluginSchemaPath)) {
      const baseSchema = JSON.parse(
        this.dependencies.fs.readFileSync(basePluginSchemaPath, 'utf8'),
      );
      this.ajv.addSchema(baseSchema, 'base-plugin.schema.json');
    } else {
      logger.error(
        'CRITICAL: Base plugin schema not found. Validation will not work.',
        {
          context: 'ConfigResolver',
        },
      );
    }
  }

  get useFactoryDefaultsOnly() {
    return this._useFactoryDefaultsOnly;
  }

  set useFactoryDefaultsOnly(value) {
    if (this._useFactoryDefaultsOnly !== value) {
      this._useFactoryDefaultsOnly = value;
      this.mainConfigLoader.useFactoryDefaultsOnly = value; // Propagate change
      this._initialized = false; // Force re-initialization on next call
    }
  }

  get isLazyLoadMode() {
    return this._isLazyLoadMode;
  }

  set isLazyLoadMode(value) {
    if (this._isLazyLoadMode !== value) {
      this._isLazyLoadMode = value;
      this._initialized = false; // Force re-initialization on next call
    }
  }

  _validatePluginConfig(pluginName, configData, pluginConfigPath) {
    const baseSchema = this.ajv.getSchema('base-plugin.schema.json').schema;
    let specificSchema = {};
    const pluginSchemaPath = this.dependencies.path.join(
      this.dependencies.path.dirname(pluginConfigPath),
      `.contract/${this.dependencies.path.basename(pluginConfigPath, '.config.yaml')}.schema.json`,
    );

    if (this.dependencies.fs.existsSync(pluginSchemaPath)) {
      try {
        specificSchema = JSON.parse(
          this.dependencies.fs.readFileSync(pluginSchemaPath, 'utf8'),
        );
      } catch (e) {
        logger.warn('Could not read or parse plugin schema file', {
          context: 'ConfigResolver',
          path: pluginSchemaPath,
          error: e.message,
        });
      }
    }

    const strictSchema = this.dependencies.deepMerge(
      baseSchema,
      specificSchema,
    );

    const objectsToRestrict = ['pdf_options', 'params', 'math', 'toc_options'];
    if (strictSchema.properties) {
      objectsToRestrict.forEach((key) => {
        if (
          strictSchema.properties[key] &&
          strictSchema.properties[key].type === 'object'
        ) {
          strictSchema.properties[key].additionalProperties = false;
        }
      });
    }

    const validate = this.ajv.compile(strictSchema);
    const isValid = validate(configData);

    if (!isValid) {
      const typoErrors = validate.errors.filter(
        (e) => e.keyword === 'additionalProperties',
      );
      const otherErrors = validate.errors.filter(
        (e) => e.keyword !== 'additionalProperties',
      );

      if (typoErrors.length > 0) {
        logger.warn('Configuration has possible typos or unknown properties', {
          context: 'ConfigResolver',
          plugin: pluginName,
        });
        typoErrors.forEach((err) => {
          const property = err.params.additionalProperty;
          const path = err.instancePath
            ? `${err.instancePath.substring(1)}.${property}`.replace(/\//g, '.')
            : property;
          logger.warn('Unknown property found in configuration', {
            context: 'ConfigResolver',
            property: path,
            file: pluginConfigPath,
          });
        });
        logger.debug('To see final applied settings, run the config command', {
          context: 'ConfigResolver',
          plugin: pluginName,
          command: `oshea config --plugin ${pluginName}`,
        });
      }

      if (otherErrors.length > 0) {
        logger.warn('Configuration has validation errors', {
          context: 'ConfigResolver',
          plugin: pluginName,
        });
        otherErrors.forEach((err) => {
          logger.warn('Validation error detail', {
            context: 'ConfigResolver',
            path: err.instancePath || '/',
            message: err.message,
          });
        });
      }
    }
  }

  async _initializeResolverIfNeeded() {
    if (this._initialized) return;

    const primary = await this.mainConfigLoader.getPrimaryMainConfig();
    this.primaryMainConfig = primary.config;
    this.primaryMainConfigPathActual = primary.path;
    this.primaryMainConfigLoadReason = primary.reason;

    const xdg = await this.mainConfigLoader.getXdgMainConfig();
    const project = await this.mainConfigLoader.getProjectManifestConfig();

    if (!this.resolvedPluginsRoot) {
      this.resolvedPluginsRoot = this.primaryMainConfig.plugins_root || null;
    }

    this.pluginConfigLoader = new this.dependencies.PluginConfigLoader(
      xdg.baseDir,
      xdg.config,
      xdg.path,
      project.baseDir,
      project.config,
      project.path,
      this.useFactoryDefaultsOnly,
      { logger: logger }, // Pass logger dependency
    );

    const currentProjectManifestPath = project.path;

    const registryBuilder = new this.dependencies.PluginRegistryBuilder(
      this.projectRoot,
      xdg.baseDir,
      currentProjectManifestPath,
      this.useFactoryDefaultsOnly,
      this.isLazyLoadMode,
      this.primaryMainConfigLoadReason,
      this.pluginInstaller,
      { pluginsRoot: this.resolvedPluginsRoot },
    );
    this.mergedPluginRegistry = await registryBuilder.buildRegistry();

    this._initialized = true;
  }

  getConfigFileSources() {
    return this._lastEffectiveConfigSources
      ? { ...this._lastEffectiveConfigSources }
      : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
  }

  async _loadPluginBaseConfig(configFilePath, assetsBasePath, pluginName) {
    if (!this.pluginConfigLoader) {
      throw new Error('PluginConfigLoader not initialized in ConfigResolver.');
    }
    const cacheKey = `base-${configFilePath}-${assetsBasePath}`;
    if (this.pluginConfigLoader._rawPluginYamlCache[cacheKey]) {
      return this.pluginConfigLoader._rawPluginYamlCache[cacheKey];
    }
    if (!configFilePath || !this.dependencies.fs.existsSync(configFilePath)) {
      logger.warn('Base config file path not provided or does not exist', {
        context: 'ConfigResolver',
        file: configFilePath,
        plugin: pluginName,
      });
      return null;
    }
    try {
      const rawConfig = await this.dependencies.loadYamlConfig(configFilePath);

      this._validatePluginConfig(pluginName, rawConfig, configFilePath);

      const initialCssPaths =
        this.dependencies.AssetResolver.resolveAndMergeCss(
          rawConfig.css_files,
          assetsBasePath,
          [],
          false,
          pluginName,
          configFilePath,
        );
      const inheritCss = rawConfig.inherit_css === true;
      const result = {
        rawConfig,
        resolvedCssPaths: initialCssPaths,
        inheritCss,
        actualPath: configFilePath,
      };
      this.pluginConfigLoader._rawPluginYamlCache[cacheKey] = result;
      return result;
    } catch (error) {
      logger.error('Failed to load plugin base configuration', {
        context: 'ConfigResolver',
        configFile: configFilePath,
        plugin: pluginName,
        error: error.message,
      });
      return {
        rawConfig: {},
        resolvedCssPaths: [],
        inheritCss: false,
        actualPath: null,
      };
    }
  }

  async getEffectiveConfig(
    pluginSpec,
    localConfigOverrides = null,
    markdownFilePath = null,
  ) {
    await this._initializeResolverIfNeeded();

    const isPathSpec =
      typeof pluginSpec === 'string' &&
      (pluginSpec.includes(this.dependencies.path.sep) ||
        pluginSpec.startsWith('.'));
    let nominalPluginNameForLookup;
    let pluginOwnConfigPath;
    let actualPluginBasePath;

    if (isPathSpec) {
      let resolvedPathSpec = pluginSpec;
      if (!this.dependencies.path.isAbsolute(resolvedPathSpec)) {
        if (
          resolvedPathSpec.startsWith('~/') ||
          resolvedPathSpec.startsWith('~\\')
        ) {
          resolvedPathSpec = this.dependencies.path.join(
            this.dependencies.os.homedir(),
            resolvedPathSpec.substring(2),
          );
        } else {
          if (
            markdownFilePath &&
            (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))
          ) {
            logger.warn(
              'Relative plugin path spec provided; resolving from CWD',
              {
                context: 'ConfigResolver',
                pathSpec: pluginSpec,
                suggestion:
                  'Path should ideally be absolute if from front matter or local config.',
              },
            );
            resolvedPathSpec = this.dependencies.path.resolve(pluginSpec);
          } else if (!this.dependencies.path.isAbsolute(resolvedPathSpec)) {
            throw new Error(
              `Relative plugin path specification '${pluginSpec}' must be resolved to an absolute path before calling getEffectiveConfig if not from CLI CWD, or use a registered plugin name.`,
            );
          }
        }
      }
      if (!this.dependencies.fs.existsSync(resolvedPathSpec)) {
        throw new Error(
          `Plugin configuration file or directory specified by path not found: '${resolvedPathSpec}'.`,
        );
      }
      const stats = this.dependencies.fs.statSync(resolvedPathSpec);
      if (stats.isDirectory()) {
        actualPluginBasePath = resolvedPathSpec;
        const dirName = this.dependencies.path.basename(actualPluginBasePath);
        pluginOwnConfigPath = this.dependencies.path.join(
          actualPluginBasePath,
          `${dirName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`,
        );
        nominalPluginNameForLookup = dirName;
        if (!this.dependencies.fs.existsSync(pluginOwnConfigPath)) {
          const filesInDir =
            this.dependencies.fs.readdirSync(actualPluginBasePath);
          const alternativeConfig = filesInDir.find((f) =>
            f.endsWith(PLUGIN_CONFIG_FILENAME_SUFFIX),
          );
          if (alternativeConfig) {
            pluginOwnConfigPath = this.dependencies.path.join(
              actualPluginBasePath,
              alternativeConfig,
            );
          } else {
            throw new Error(
              `Plugin directory '${actualPluginBasePath}' specified, but no *.config.yaml file found within it.`,
            );
          }
        }
      } else if (stats.isFile()) {
        pluginOwnConfigPath = resolvedPathSpec;
        actualPluginBasePath =
          this.dependencies.path.dirname(pluginOwnConfigPath);
        nominalPluginNameForLookup =
          this.dependencies.path.basename(actualPluginBasePath);
      } else {
        throw new Error(
          `Plugin path specification '${resolvedPathSpec}' is neither a file nor a directory.`,
        );
      }
    } else {
      nominalPluginNameForLookup = pluginSpec;
      const pluginRegistryEntry = this.mergedPluginRegistry
        ? this.mergedPluginRegistry[nominalPluginNameForLookup]
        : null;
      if (!pluginRegistryEntry || !pluginRegistryEntry.configPath) {
        throw new Error(
          `Plugin '${nominalPluginNameForLookup}' is not registered or its configuration path could not be resolved.`,
        );
      }
      pluginOwnConfigPath = pluginRegistryEntry.configPath;
      if (!this.dependencies.fs.existsSync(pluginOwnConfigPath)) {
        throw new Error(
          `Configuration file for plugin '${nominalPluginNameForLookup}' not found at registered path: '${pluginOwnConfigPath}'.`,
        );
      }
      actualPluginBasePath =
        this.dependencies.path.dirname(pluginOwnConfigPath);
    }

    const localOverridesCacheKeyPart = localConfigOverrides
      ? JSON.stringify(localConfigOverrides)
      : 'noLocalOverrides';
    const markdownFilePathCacheKeyPart = markdownFilePath || 'noMarkdownFile';
    const cacheKey = `${nominalPluginNameForLookup}-${isPathSpec ? 'pathspec' : 'namespec'}-${pluginOwnConfigPath}-${this.useFactoryDefaultsOnly}-${this.primaryMainConfigPathActual}-${localOverridesCacheKeyPart}-${markdownFilePathCacheKeyPart}`;

    if (this.loadedPluginConfigsCache[cacheKey]) {
      return this.loadedPluginConfigsCache[cacheKey];
    }

    const loadedConfigSourcePaths = {
      mainConfigPath: this.primaryMainConfigPathActual,
      pluginConfigPaths: [],
      cssFiles: [],
    };

    const layer0Data = await this._loadPluginBaseConfig(
      pluginOwnConfigPath,
      actualPluginBasePath,
      nominalPluginNameForLookup,
    );
    if (!layer0Data || !layer0Data.rawConfig) {
      throw new Error(
        `Failed to load plugin's own base configuration for '${nominalPluginNameForLookup}' from '${pluginOwnConfigPath}'.`,
      );
    }
    loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);

    const originalHandlerScript = layer0Data.rawConfig.handler_script;
    if (!originalHandlerScript) {
      throw new Error(
        `'handler_script' not defined in plugin '${nominalPluginNameForLookup}'s own configuration file: ${pluginOwnConfigPath}. This can happen if the YAML is invalid or fails schema validation. Please check the logs for warnings from the configuration loader.`,
      );
    }

    const {
      mergedConfig: configAfterXLPOlayers,
      mergedCssPaths: cssAfterXLPOlayers,
    } = await this.pluginConfigLoader.applyOverrideLayers(
      nominalPluginNameForLookup,
      layer0Data,
      loadedConfigSourcePaths.pluginConfigPaths,
    );

    let currentMergedConfig = configAfterXLPOlayers;
    let currentCssPaths = cssAfterXLPOlayers;

    if (localConfigOverrides && Object.keys(localConfigOverrides).length > 0) {
      currentMergedConfig = this.dependencies.deepMerge(
        currentMergedConfig,
        localConfigOverrides,
      );

      if (localConfigOverrides.css_files && markdownFilePath) {
        const localConfigDir = this.dependencies.path.dirname(markdownFilePath);
        currentCssPaths = this.dependencies.AssetResolver.resolveAndMergeCss(
          localConfigOverrides.css_files,
          localConfigDir,
          currentCssPaths,
          localConfigOverrides.inheritCss === true,
          nominalPluginNameForLookup,
          `${this.dependencies.path.basename(markdownFilePath, this.dependencies.path.extname(markdownFilePath))}.config.yaml`,
        );
      }
      const localConfigFilenameForLog = markdownFilePath
        ? `${this.dependencies.path.basename(markdownFilePath, this.dependencies.path.extname(markdownFilePath))}.config.yaml`
        : '<filename>.config.yaml';
      loadedConfigSourcePaths.pluginConfigPaths.push(
        `Local file override from '${localConfigFilenameForLog}'`,
      );
    }

    currentMergedConfig.handler_script = originalHandlerScript;

    if (this.primaryMainConfig.global_pdf_options) {
      currentMergedConfig.pdf_options = this.dependencies.deepMerge(
        this.primaryMainConfig.global_pdf_options,
        currentMergedConfig.pdf_options || {},
      );
      if (
        this.primaryMainConfig.global_pdf_options.margin &&
        currentMergedConfig.pdf_options?.margin
      ) {
        currentMergedConfig.pdf_options.margin = this.dependencies.deepMerge(
          this.primaryMainConfig.global_pdf_options.margin,
          currentMergedConfig.pdf_options.margin,
        );
      }
    }

    const pluginOwnMathConfig = currentMergedConfig.math || {};
    let effectiveMathConfig = this.primaryMainConfig.math || {};
    effectiveMathConfig = this.dependencies.deepMerge(
      effectiveMathConfig,
      pluginOwnMathConfig,
    );
    if (
      this.primaryMainConfig.math?.katex_options ||
      pluginOwnMathConfig.katex_options
    ) {
      effectiveMathConfig.katex_options = this.dependencies.deepMerge(
        this.primaryMainConfig.math?.katex_options || {},
        pluginOwnMathConfig.katex_options || {},
      );
    }
    currentMergedConfig.math = effectiveMathConfig;

    currentMergedConfig.css_files = [
      ...new Set(
        currentCssPaths.filter((p) => p && this.dependencies.fs.existsSync(p)),
      ),
    ];
    loadedConfigSourcePaths.cssFiles = currentMergedConfig.css_files;

    const handlerScriptPath = this.dependencies.path.resolve(
      actualPluginBasePath,
      currentMergedConfig.handler_script,
    );
    if (!this.dependencies.fs.existsSync(handlerScriptPath)) {
      logger.error('Handler script not found', {
        context: 'ConfigResolver',
        plugin: nominalPluginNameForLookup,
        handlerPath: handlerScriptPath,
      });
      throw new Error('Handler script not found.');
    }

    const effectiveDetails = {
      pluginSpecificConfig: currentMergedConfig,
      mainConfig: this.primaryMainConfig,
      pluginBasePath: actualPluginBasePath,
      handlerScriptPath: handlerScriptPath,
      _wasFactoryDefaults: this.useFactoryDefaultsOnly,
    };

    this.loadedPluginConfigsCache[cacheKey] = effectiveDetails;
    this._lastEffectiveConfigSources = loadedConfigSourcePaths;
    return effectiveDetails;
  }

  async getResolvedCollRoot() {
    await this._initializeResolverIfNeeded();
    return this.resolvedPluginsRoot;
  }
}

module.exports = ConfigResolver;
