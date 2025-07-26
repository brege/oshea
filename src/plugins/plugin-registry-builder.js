// src/plugins/plugin-registry-builder.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { markdownUtilsPath, loggerPath } = require('@paths');
const logger = require(loggerPath);
const { loadConfig: loadYamlConfig } = require(markdownUtilsPath);
const yaml = require('js-yaml');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';
const CM_ENABLED_MANIFEST_FILENAME = 'enabled.yaml';

class PluginRegistryBuilder {
  constructor(
    projectRoot,
    xdgBaseDir,
    projectManifestConfigPath,
    useFactoryDefaultsOnly = false,
    isLazyLoadMode = false,
    primaryMainConfigLoadReason = null,
    collectionsManagerInstance = null,
    dependencies = {}
  ) {
    const defaultDependencies = { fs, fsPromises: fs.promises, path, os, loadYamlConfig, yaml, process };
    this.dependencies = { ...defaultDependencies, ...dependencies };

    this.projectRoot = projectRoot;
    if (!this.projectRoot || typeof this.projectRoot !== 'string') {
      logger.error('PluginRegistryBuilder: projectRoot must be a valid path string.', {
        context: 'PluginRegistryBuilder',
        error: 'Invalid projectRoot provided',
        projectRoot: this.projectRoot
      });
      throw new Error('PluginRegistryBuilder: projectRoot must be a valid path string.');
    }
    logger.debug('PluginRegistryBuilder initialized with projectRoot', {
      context: 'PluginRegistryBuilder',
      projectRoot: this.projectRoot
    });

    this.isLazyLoadMode = isLazyLoadMode;
    this.primaryMainConfigLoadReason = primaryMainConfigLoadReason;

    if (!xdgBaseDir || typeof xdgBaseDir !== 'string') {
      const xdgConfigHome = this.dependencies.process.env.XDG_CONFIG_HOME || this.dependencies.path.join(this.dependencies.os.homedir(), '.config');
      this.xdgBaseDir = this.dependencies.path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
      logger.debug('XDG base directory determined automatically', {
        context: 'PluginRegistryBuilder',
        xdgBaseDir: this.xdgBaseDir
      });
    } else {
      this.xdgBaseDir = xdgBaseDir;
      logger.debug('XDG base directory provided manually', {
        context: 'PluginRegistryBuilder',
        xdgBaseDir: this.xdgBaseDir
      });
    }
    this.xdgGlobalConfigPath = this.dependencies.path.join(this.xdgBaseDir, 'config.yaml');

    this.projectManifestConfigPath = projectManifestConfigPath;
    this.projectManifestBaseDir = this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && this.dependencies.fs.existsSync(this.projectManifestConfigPath) ? this.dependencies.path.dirname(this.projectManifestConfigPath) : null;
    if (this.projectManifestConfigPath) {
      logger.debug('Project manifest config path set', {
        context: 'PluginRegistryBuilder',
        path: this.projectManifestConfigPath,
        baseDir: this.projectManifestBaseDir
      });
    }

    this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
    this.collectionsManager = collectionsManagerInstance;
    this._builtRegistry = null;

    this.cmCollRoot = this.dependencies.collRoot;
    if (!this.cmCollRoot) {
      logger.error('PluginRegistryBuilder requires collections root (collRoot).', {
        context: 'PluginRegistryBuilder',
        error: 'Missing collRoot dependency'
      });
      throw new Error('PluginRegistryBuilder requires a collections root (collRoot) to be provided.');
    }
    this.cmEnabledManifestPath = this.dependencies.path.join(this.cmCollRoot, CM_ENABLED_MANIFEST_FILENAME);
    logger.debug('Collections Manager root and enabled manifest path set', {
      context: 'PluginRegistryBuilder',
      cmCollRoot: this.cmCollRoot,
      cmEnabledManifestPath: this.cmEnabledManifestPath
    });
  }

  async _registerBundledPlugins() {
    const { fs, path } = this.dependencies;
    const registrations = {};
    const bundledPluginsPath = path.join(this.projectRoot, 'plugins');

    logger.debug('Attempting to register bundled plugins', {
      context: 'PluginRegistryBuilder',
      bundledPluginsPath: bundledPluginsPath
    });

    if (!fs.existsSync(bundledPluginsPath)) {
      logger.warn('Bundled plugins directory not found.', {
        context: 'PluginRegistryBuilder',
        path: bundledPluginsPath,
        suggestion: 'No bundled plugins will be registered.'
      });
      return registrations;
    }

    const pluginDirs = await fs.promises.readdir(bundledPluginsPath);
    for (const pluginName of pluginDirs) {
      if (pluginName === 'index.md') continue; // Skip index.md, it's not a plugin directory
      const pluginDir = path.join(bundledPluginsPath, pluginName);
      if (fs.statSync(pluginDir).isDirectory()) {
        const configPath = path.join(pluginDir, `${pluginName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
        if (fs.existsSync(configPath)) {
          registrations[pluginName] = {
            configPath: configPath,
            definedIn: bundledPluginsPath,
            sourceType: 'Bundled (Auto-discovered)'
          };
          logger.debug('Found bundled plugin', {
            context: 'PluginRegistryBuilder',
            pluginName: pluginName,
            configPath: configPath
          });
        } else {
          logger.warn('Bundled plugin directory found but no config file', {
            context: 'PluginRegistryBuilder',
            pluginDir: pluginDir,
            expectedConfig: `${pluginName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`,
            suggestion: 'Skipping registration for this directory.'
          });
        }
      }
    }
    logger.debug('Bundled plugins registration complete', {
      context: 'PluginRegistryBuilder',
      registeredCount: Object.keys(registrations).length
    });
    return registrations;
  }

  _resolveAlias(alias, aliasValue, basePathDefiningAlias) {
    const { path, os } = this.dependencies;
    logger.debug('Attempting to resolve alias', {
      context: 'PluginRegistryBuilder',
      alias: alias,
      aliasValue: aliasValue,
      basePathDefiningAlias: basePathDefiningAlias
    });

    if (typeof aliasValue !== 'string' || aliasValue.trim() === '') {
      logger.warn('Invalid alias value for resolution', {
        context: 'PluginRegistryBuilder',
        alias: alias,
        aliasValue: aliasValue,
        reason: 'Empty or non-string alias value.'
      });
      return null;
    }

    let resolvedAliasPath = aliasValue;
    if (resolvedAliasPath.startsWith('~/') || resolvedAliasPath.startsWith('~\\')) {
      resolvedAliasPath = path.join(os.homedir(), resolvedAliasPath.substring(2));
      logger.debug('Resolved alias path using homedir (~)', {
        context: 'PluginRegistryBuilder',
        alias: alias,
        resolvedPath: resolvedAliasPath
      });
    }

    if (!path.isAbsolute(resolvedAliasPath)) {
      if (!basePathDefiningAlias) {
        logger.warn('Cannot resolve relative alias target, base path unknown', {
          context: 'PluginRegistryBuilder',
          alias: alias,
          aliasValue: aliasValue,
          reason: 'Base path defining the alias is unknown.'
        });
        return null;
      }
      resolvedAliasPath = path.resolve(basePathDefiningAlias, resolvedAliasPath);
      logger.debug('Resolved alias path as relative to base path', {
        context: 'PluginRegistryBuilder',
        alias: alias,
        resolvedPath: resolvedAliasPath,
        basePath: basePathDefiningAlias
      });
    }
    logger.debug('Alias resolution successful', {
      context: 'PluginRegistryBuilder',
      alias: alias,
      resolvedPath: resolvedAliasPath
    });
    return resolvedAliasPath;
  }

  _resolvePluginConfigPath(rawPath, basePathForMainConfig, currentAliases) {
    const { fs, path, os } = this.dependencies;
    logger.debug('Attempting to resolve plugin config path', {
      context: 'PluginRegistryBuilder',
      rawPath: rawPath,
      basePathForMainConfig: basePathForMainConfig
    });

    if (typeof rawPath !== 'string' || rawPath.trim() === '') {
      logger.warn('Invalid raw plugin path provided for resolution', {
        context: 'PluginRegistryBuilder',
        rawPath: rawPath,
        reason: 'Empty or non-string raw path.'
      });
      return null;
    }

    let resolvedPath = rawPath;
    const aliasParts = rawPath.split(':');
    if (aliasParts.length > 1 && currentAliases && currentAliases[aliasParts[0]]) {
      const aliasName = aliasParts[0];
      const pathWithinAlias = aliasParts.slice(1).join(':'); // Re-join if path itself contains colons
      const resolvedAliasBasePath = currentAliases[aliasName];
      if (resolvedAliasBasePath) {
        resolvedPath = path.join(resolvedAliasBasePath, pathWithinAlias);
        logger.debug('Resolved plugin path using alias', {
          context: 'PluginRegistryBuilder',
          aliasName: aliasName,
          pathWithinAlias: pathWithinAlias,
          resolvedPath: resolvedPath
        });
      } else {
        logger.warn('Alias used in plugin path could not be resolved to a base path', {
          context: 'PluginRegistryBuilder',
          aliasName: aliasName,
          rawPath: rawPath,
          suggestion: 'Check alias definition. Skipping registration.'
        });
        return null;
      }
    }
    else if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
      resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
      logger.debug('Resolved plugin path using homedir (~)', {
        context: 'PluginRegistryBuilder',
        rawPath: rawPath,
        resolvedPath: resolvedPath
      });
    }

    if (!path.isAbsolute(resolvedPath)) {
      if (!basePathForMainConfig) {
        logger.warn('Cannot resolve relative plugin config path, base path unknown', {
          context: 'PluginRegistryBuilder',
          rawPath: rawPath,
          reason: 'Base path for main config could not be determined. Skipping registration.'
        });
        return null;
      }
      resolvedPath = path.resolve(basePathForMainConfig, resolvedPath);
      logger.debug('Resolved plugin path as relative to main config base path', {
        context: 'PluginRegistryBuilder',
        rawPath: rawPath,
        resolvedPath: resolvedPath,
        basePath: basePathForMainConfig
      });
    }

    try {
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        logger.debug('Plugin config path resolved to an existing file', {
          context: 'PluginRegistryBuilder',
          rawPath: rawPath,
          resolvedPath: resolvedPath
        });
        return resolvedPath;
      } else if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        const dirName = path.basename(resolvedPath);
        const conventionalConfigPath = path.join(resolvedPath, `${dirName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
        if (fs.existsSync(conventionalConfigPath) && fs.statSync(conventionalConfigPath).isFile()) {
          logger.debug('Plugin config path resolved to directory, found conventional config file', {
            context: 'PluginRegistryBuilder',
            rawPath: rawPath,
            resolvedPath: resolvedPath,
            conventionalConfigPath: conventionalConfigPath
          });
          return conventionalConfigPath;
        }
        const filesInDir = fs.readdirSync(resolvedPath);
        const alternativeConfig = filesInDir.find(f => f.endsWith(PLUGIN_CONFIG_FILENAME_SUFFIX));
        if (alternativeConfig) {
          const altPath = path.join(resolvedPath, alternativeConfig);
          logger.info('Using alternative config file for plugin directory', {
            context: 'PluginRegistryBuilder',
            rawPath: rawPath,
            resolvedDirectory: resolvedPath,
            alternativeConfigFound: alternativeConfig,
            finalPath: altPath
          });
          return altPath;
        }
        logger.warn('Plugin configuration path (directory) does not contain a suitable config file', {
          context: 'PluginRegistryBuilder',
          rawPath: rawPath,
          resolvedPath: resolvedPath,
          suffix: PLUGIN_CONFIG_FILENAME_SUFFIX,
          suggestion: 'Skipping registration for this entry.'
        });
        return null;
      } else {
        logger.warn('Plugin configuration path does not exist', {
          context: 'PluginRegistryBuilder',
          rawPath: rawPath,
          resolvedPath: resolvedPath,
          suggestion: 'Skipping registration for this entry.'
        });
        return null;
      }
    } catch (e) {
      logger.warn('Error accessing resolved plugin configuration path', {
        context: 'PluginRegistryBuilder',
        rawPath: rawPath,
        resolvedPath: resolvedPath,
        error: e.message,
        stack: e.stack,
        suggestion: 'Skipping registration for this entry.'
      });
      return null;
    }
  }

  async _getPluginRegistrationsFromFile(mainConfigFilePath, basePathForMainConfig, sourceType) {
    const { fs, loadYamlConfig } = this.dependencies;
    logger.debug('Attempting to get plugin registrations from file', {
      context: 'PluginRegistryBuilder',
      mainConfigFilePath: mainConfigFilePath,
      sourceType: sourceType
    });

    if (!mainConfigFilePath || !fs.existsSync(mainConfigFilePath)) {
      logger.debug('Main config file for plugin registrations not found', {
        context: 'PluginRegistryBuilder',
        mainConfigFilePath: mainConfigFilePath,
        reason: 'File does not exist.'
      });
      return {};
    }
    try {
      const config = await loadYamlConfig(mainConfigFilePath);
      const registrations = {};
      let currentAliases = {};

      if (config && config.plugin_directory_aliases && typeof config.plugin_directory_aliases === 'object') {
        for (const [alias, aliasPathRaw] of Object.entries(config.plugin_directory_aliases)) {
          const resolvedAliasTarget = this._resolveAlias(alias, aliasPathRaw, basePathForMainConfig);
          if (resolvedAliasTarget) {
            currentAliases[alias] = resolvedAliasTarget;
            logger.debug('Registered plugin directory alias', {
              context: 'PluginRegistryBuilder',
              alias: alias,
              target: resolvedAliasTarget,
              definedIn: mainConfigFilePath
            });
          }
        }
      }

      if (config && config.plugins && typeof config.plugins === 'object') {
        for (const [pluginName, pluginConfPathRaw] of Object.entries(config.plugins)) {
          const resolvedPath = this._resolvePluginConfigPath(pluginConfPathRaw, basePathForMainConfig, currentAliases);
          if (resolvedPath) {
            registrations[pluginName] = {
              configPath: resolvedPath,
              definedIn: mainConfigFilePath,
              sourceType: sourceType
            };
            logger.debug('Registered plugin from config file', {
              context: 'PluginRegistryBuilder',
              pluginName: pluginName,
              configPath: resolvedPath,
              definedIn: mainConfigFilePath
            });
          }
        }
      }
      logger.debug('Plugin registrations from file complete', {
        context: 'PluginRegistryBuilder',
        sourceFile: mainConfigFilePath,
        registeredCount: Object.keys(registrations).length
      });
      return registrations;
    } catch (error) {
      logger.error('Error reading plugin registrations from file', {
        context: 'PluginRegistryBuilder',
        file: mainConfigFilePath,
        error: error.message,
        stack: error.stack,
        operation: '_getPluginRegistrationsFromFile'
      });
      return {};
    }
  }

  async _getPluginRegistrationsFromCmManifest(cmEnabledManifestPath, sourceType) {
    const { fs, fsPromises, yaml } = this.dependencies;
    const registrations = {};
    logger.debug('Attempting to get plugin registrations from CM manifest', {
      context: 'PluginRegistryBuilder',
      cmEnabledManifestPath: cmEnabledManifestPath,
      sourceType: sourceType
    });

    if (!fs.existsSync(cmEnabledManifestPath)) {
      logger.debug('CM enabled manifest not found', {
        context: 'PluginRegistryBuilder',
        path: cmEnabledManifestPath,
        reason: 'File does not exist.'
      });
      return registrations;
    }
    try {
      const manifestContent = await fsPromises.readFile(cmEnabledManifestPath, 'utf8');
      const parsedManifest = yaml.load(manifestContent);

      if (parsedManifest && Array.isArray(parsedManifest.enabled_plugins)) {
        for (const pluginEntry of parsedManifest.enabled_plugins) {
          if (pluginEntry && pluginEntry.invoke_name && pluginEntry.config_path) {
            if (fs.existsSync(pluginEntry.config_path)) {
              registrations[pluginEntry.invoke_name] = {
                configPath: pluginEntry.config_path,
                definedIn: cmEnabledManifestPath,
                sourceType: `${sourceType} (CM: ${pluginEntry.collection_name}/${pluginEntry.plugin_id})`,
                cmOriginalCollection: pluginEntry.collection_name,
                cmOriginalPluginId: pluginEntry.plugin_id,
                cmAddedOn: pluginEntry.added_on,
                cmStatus: 'Enabled (CM)'
              };
              logger.debug('Registered plugin from CM manifest', {
                context: 'PluginRegistryBuilder',
                invokeName: pluginEntry.invoke_name,
                configPath: pluginEntry.config_path,
                collection: pluginEntry.collection_name,
                pluginId: pluginEntry.plugin_id
              });
            } else {
              logger.warn('Config path for CM-enabled plugin does not exist', {
                context: 'PluginRegistryBuilder',
                invokeName: pluginEntry.invoke_name,
                configPath: pluginEntry.config_path,
                suggestion: 'Skipping registration for this entry.'
              });
            }
          } else {
            logger.warn('Invalid entry in CM manifest', {
              context: 'PluginRegistryBuilder',
              invalidEntry: pluginEntry,
              suggestion: 'Skipping invalid manifest entry.'
            });
          }
        }
      }
      logger.debug('Plugin registrations from CM manifest complete', {
        context: 'PluginRegistryBuilder',
        sourceFile: cmEnabledManifestPath,
        registeredCount: Object.keys(registrations).length
      });
    } catch (error) {
      logger.error('Error reading or parsing CM manifest', {
        context: 'PluginRegistryBuilder',
        file: cmEnabledManifestPath,
        error: error.message,
        stack: error.stack,
        operation: '_getPluginRegistrationsFromCmManifest'
      });
    }
    return registrations;
  }

  async buildRegistry() {
    if (this._builtRegistry) {
      logger.debug('Returning cached plugin registry', {
        context: 'PluginRegistryBuilder'
      });
      return this._builtRegistry.registry;
    }

    logger.debug('Building new plugin registry', {
      context: 'PluginRegistryBuilder',
      useFactoryDefaultsOnly: this.useFactoryDefaultsOnly
    });

    const { fs } = this.dependencies;
    const registry = await this._registerBundledPlugins();
    logger.debug('Initial registry size after bundled plugins', {
      context: 'PluginRegistryBuilder',
      count: Object.keys(registry).length
    });

    if (!this.useFactoryDefaultsOnly) {
      const cmEnabledRegistrations = await this._getPluginRegistrationsFromCmManifest(this.cmEnabledManifestPath, 'CollectionsManager');
      Object.assign(registry, cmEnabledRegistrations);
      logger.debug('Registry size after CM enabled plugins', {
        context: 'PluginRegistryBuilder',
        count: Object.keys(registry).length
      });
    }

    if (!this.useFactoryDefaultsOnly) {
      if (fs.existsSync(this.xdgGlobalConfigPath)) {
        const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir, 'XDG Global');
        Object.assign(registry, xdgRegistrations);
        logger.debug('Registry size after XDG global configs', {
          context: 'PluginRegistryBuilder',
          count: Object.keys(registry).length
        });
      } else {
        logger.debug('XDG global config path not found, skipping registrations', {
          context: 'PluginRegistryBuilder',
          path: this.xdgGlobalConfigPath
        });
      }
    }

    if (!this.useFactoryDefaultsOnly) {
      if (this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath)) {
        const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir, 'Project Manifest (--config)');
        Object.assign(registry, projectRegistrations);
        logger.debug('Registry size after project manifest configs', {
          context: 'PluginRegistryBuilder',
          count: Object.keys(registry).length
        });
      } else {
        logger.debug('Project manifest config path not found or invalid, skipping registrations', {
          context: 'PluginRegistryBuilder',
          path: this.projectManifestConfigPath
        });
      }
    }

    this._builtRegistry = {
      registry,
      builtWithFactoryDefaults: this.useFactoryDefaultsOnly,
      projectManifestPathUsed: this.projectManifestConfigPath,
      isLazyLoadMode: this.isLazyLoadMode,
      primaryMainConfigLoadReason: this.primaryMainConfigLoadReason,
      collectionsManagerInstance: this.collectionsManager
    };
    logger.debug('Plugin registry built successfully', {
      context: 'PluginRegistryBuilder',
      totalPlugins: Object.keys(registry).length,
      builtWithFactoryDefaults: this.useFactoryDefaultsOnly
    });
    return registry;
  }

  async getAllPluginDetails() {
    const { fs, path, loadYamlConfig } = this.dependencies;
    logger.debug('Retrieving all plugin details', {
      context: 'PluginRegistryBuilder'
    });

    const pluginDetailsMap = new Map();
    const traditionalRegistry = await this.buildRegistry();

    for (const pluginName in traditionalRegistry) {
      if (Object.prototype.hasOwnProperty.call(traditionalRegistry, pluginName)) {
        const regInfo = traditionalRegistry[pluginName];
        let description = 'N/A';
        try {
          if (regInfo.configPath && fs.existsSync(regInfo.configPath) && fs.statSync(regInfo.configPath).isFile()) {
            const pluginConfig = await loadYamlConfig(regInfo.configPath);
            description = pluginConfig.description || 'N/A';
            logger.debug('Loaded plugin description from config', {
              context: 'PluginRegistryBuilder',
              pluginName: pluginName,
              configPath: regInfo.configPath
            });
          } else {
            description = `Error: Config path '${regInfo.configPath || 'undefined'}' not found or not a file.`;
            logger.warn('Plugin config path not found or not a file when getting details', {
              context: 'PluginRegistryBuilder',
              pluginName: pluginName,
              configPath: regInfo.configPath
            });
          }
        } catch (e) {
          description = `Error loading config: ${e.message.substring(0, 50)}...`;
          logger.warn('Error loading plugin config for details', {
            context: 'PluginRegistryBuilder',
            pluginName: pluginName,
            configPath: regInfo.configPath,
            error: e.message
          });
        }

        let regSourceDisplay = regInfo.sourceType;
        if (regInfo.definedIn) {
          const definedInFilename = path.basename(regInfo.definedIn);
          if (regInfo.sourceType.startsWith('Project Manifest')) regSourceDisplay = `Project (--config: ${definedInFilename})`;
          else if (regInfo.sourceType === 'XDG Global') regSourceDisplay = `XDG (${definedInFilename})`;
          else if (regInfo.sourceType.includes('Bundled Definitions')) regSourceDisplay = `Bundled (${definedInFilename})`;
          else if (regInfo.sourceType.includes('Factory Default')) regSourceDisplay = `Factory (${definedInFilename})`;
        }
        logger.debug('Processed plugin registration source display', {
          context: 'PluginRegistryBuilder',
          pluginName: pluginName,
          sourceType: regInfo.sourceType,
          definedIn: regInfo.definedIn,
          display: regSourceDisplay
        });

        pluginDetailsMap.set(pluginName, {
          name: pluginName, description, configPath: regInfo.configPath,
          registrationSourceDisplay: regSourceDisplay,
          status: regInfo.cmStatus || `Registered (${regInfo.sourceType.split('(')[0].trim()})`,
          cmCollection: regInfo.cmOriginalCollection, cmPluginId: regInfo.cmOriginalPluginId,
          cmInvokeName: regInfo.cmStatus === 'Enabled (CM)' ? pluginName : undefined,
          cmAddedOn: regInfo.cmAddedOn
        });
      }
    }
    logger.debug('Finished processing traditional registry details', {
      context: 'PluginRegistryBuilder',
      count: pluginDetailsMap.size
    });

    if (this.collectionsManager) {
      logger.debug('Fetching details from Collections Manager', {
        context: 'PluginRegistryBuilder'
      });
      const cmAvailable = await this.collectionsManager.listAvailablePlugins(null) || [];
      const cmEnabled = await this.collectionsManager.listCollections('enabled', null) || [];
      const cmEnabledDetailsMap = new Map();
      cmEnabled.forEach(enabledPlugin => {
        const fullCmId = `${enabledPlugin.collection_name}/${enabledPlugin.plugin_id}`;
        if (!cmEnabledDetailsMap.has(fullCmId)) {
          cmEnabledDetailsMap.set(fullCmId, []);
        }
        cmEnabledDetailsMap.get(fullCmId).push({
          invokeName: enabledPlugin.invoke_name,
          configPath: enabledPlugin.config_path,
          addedOn: enabledPlugin.added_on
        });
        logger.debug('Mapped CM enabled plugin instance', {
          context: 'PluginRegistryBuilder',
          fullCmId: fullCmId,
          invokeName: enabledPlugin.invoke_name
        });
      });

      for (const availableCmPlugin of cmAvailable) {
        const fullCmId = `${availableCmPlugin.collection}/${availableCmPlugin.plugin_id}`;
        const enabledInstances = cmEnabledDetailsMap.get(fullCmId);

        if (enabledInstances && enabledInstances.length > 0) {
          enabledInstances.forEach(instance => {
            pluginDetailsMap.set(instance.invokeName, {
              name: instance.invokeName, description: availableCmPlugin.description,
              configPath: instance.config_path,
              registrationSourceDisplay: `CollectionsManager (CM: ${fullCmId})`,
              status: 'Enabled (CM)', cmCollection: availableCmPlugin.collection,
              cmPluginId: availableCmPlugin.plugin_id, cmInvokeName: instance.invokeName,
              cmAddedOn: instance.addedOn
            });
            logger.debug('Added CM enabled plugin detail to map', {
              context: 'PluginRegistryBuilder',
              invokeName: instance.invokeName
            });
          });
        } else {
          // Only add if not already present from traditional registry or another CM instance
          if (!pluginDetailsMap.has(fullCmId) && !pluginDetailsMap.has(availableCmPlugin.plugin_id)) {
            pluginDetailsMap.set(fullCmId, {
              name: fullCmId, description: availableCmPlugin.description,
              configPath: availableCmPlugin.config_path,
              registrationSourceDisplay: `CollectionsManager (CM: ${fullCmId})`,
              status: 'Available (CM)', cmCollection: availableCmPlugin.collection,
              cmPluginId: availableCmPlugin.plugin_id, cmInvokeName: undefined,
              cmAddedOn: undefined
            });
            logger.debug('Added CM available plugin detail to map', {
              context: 'PluginRegistryBuilder',
              fullCmId: fullCmId
            });
          }
        }
      }
      logger.debug('Finished processing Collections Manager plugin details', {
        context: 'PluginRegistryBuilder',
        cmAvailableCount: cmAvailable.length,
        cmEnabledCount: cmEnabled.length
      });
    }

    const finalDetails = Array.from(pluginDetailsMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    logger.info('Successfully retrieved all plugin details', {
      context: 'PluginRegistryBuilder',
      totalDetailsCount: finalDetails.length
    });
    return finalDetails;
  }
}

module.exports = PluginRegistryBuilder;
