// src/plugins/plugin-registry-builder.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { markdownUtilsPath, loggerPath } = require('@paths');
const logger = require(loggerPath);
const { loadConfig: loadYamlConfig } = require(markdownUtilsPath);
const yaml = require('js-yaml');

const XDG_CONFIG_DIR_NAME = 'oshea';
const PLUGIN_CONFIG_FILENAME = 'default.yaml';
const PLUGIN_MANIFEST_FILENAME = 'plugins.yaml';

class PluginRegistryBuilder {
  constructor(
    projectRoot,
    xdgBaseDir,
    projectManifestConfigPath,
    useFactoryDefaultsOnly = false,
    isLazyLoadMode = false,
    primaryMainConfigLoadReason = null,
    pluginInstallerInstance = null,
    dependencies = {},
  ) {
    const defaultDependencies = {
      fs,
      fsPromises: fs.promises,
      path,
      os,
      loadYamlConfig,
      yaml,
      process,
    };
    this.dependencies = { ...defaultDependencies, ...dependencies };

    this.projectRoot = projectRoot;
    this.isLazyLoadMode = isLazyLoadMode;
    this.primaryMainConfigLoadReason = primaryMainConfigLoadReason;
    this.pluginInstaller = pluginInstallerInstance;
    this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

    if (!xdgBaseDir || typeof xdgBaseDir !== 'string') {
      const xdgConfigHome =
        this.dependencies.process.env.XDG_CONFIG_HOME ||
        this.dependencies.path.join(this.dependencies.os.homedir(), '.config');
      this.xdgBaseDir = this.dependencies.path.join(
        xdgConfigHome,
        XDG_CONFIG_DIR_NAME,
      );
    } else {
      this.xdgBaseDir = xdgBaseDir;
    }

    this.pluginsRoot =
      this.dependencies.pluginsRoot ||
      this.pluginInstaller?.pluginsRoot ||
      this.dependencies.path.join(this.xdgBaseDir, 'plugins');
    this.pluginsManifestPath = this.dependencies.path.join(
      this.pluginsRoot,
      PLUGIN_MANIFEST_FILENAME,
    );

    this.xdgGlobalConfigPath = this.dependencies.path.join(
      this.xdgBaseDir,
      'config.yaml',
    );
    this.projectManifestConfigPath = projectManifestConfigPath;
    this.projectManifestBaseDir =
      this.projectManifestConfigPath &&
      typeof this.projectManifestConfigPath === 'string' &&
      this.dependencies.fs.existsSync(this.projectManifestConfigPath)
        ? this.dependencies.path.dirname(this.projectManifestConfigPath)
        : null;

    this._builtRegistry = null;
  }

  async _registerBundledPlugins() {
    const { fs, path } = this.dependencies;
    const registrations = {};
    const bundledPluginsPath = path.join(this.projectRoot, 'plugins');

    if (!fs.existsSync(bundledPluginsPath)) {
      return registrations;
    }

    const pluginDirs = await fs.promises.readdir(bundledPluginsPath);
    for (const pluginName of pluginDirs) {
      if (pluginName === 'index.md') continue;

      const pluginDir = path.join(bundledPluginsPath, pluginName);
      if (!fs.statSync(pluginDir).isDirectory()) continue;

      const configPath = path.join(pluginDir, PLUGIN_CONFIG_FILENAME);
      if (!fs.existsSync(configPath)) continue;

      registrations[pluginName] = {
        configPath,
        definedIn: bundledPluginsPath,
        sourceType: 'Bundled',
      };
    }

    return registrations;
  }

  async _registerInstalledPlugins() {
    const { fs, fsPromises, yaml } = this.dependencies;
    const registrations = {};

    if (!fs.existsSync(this.pluginsManifestPath)) {
      return registrations;
    }

    try {
      const content = await fsPromises.readFile(
        this.pluginsManifestPath,
        'utf8',
      );
      const parsed = yaml.load(content) || {};
      const plugins = parsed.plugins || {};

      for (const invokeName of Object.keys(plugins)) {
        const entry = plugins[invokeName];
        if (!entry?.config_path || !fs.existsSync(entry.config_path)) {
          continue;
        }

        registrations[invokeName] = {
          configPath: entry.config_path,
          definedIn: this.pluginsManifestPath,
          sourceType: 'Installed',
          isEnabled: entry.enabled !== false,
          pluginType: entry.type || 'added',
        };
      }
    } catch (error) {
      logger.warn('Could not read installed plugins manifest', {
        context: 'PluginRegistryBuilder',
        path: this.pluginsManifestPath,
        error: error.message,
      });
    }

    return registrations;
  }

  _resolvePluginPath(pluginName, pluginPathValue, basePathDefiningPath) {
    const { path, os } = this.dependencies;

    if (typeof pluginPathValue !== 'string' || pluginPathValue.trim() === '') {
      return null;
    }

    let resolvedPath = pluginPathValue;
    if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
      resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
    } else if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(basePathDefiningPath, resolvedPath);
    }

    if (!path.isAbsolute(resolvedPath)) {
      logger.warn('Plugin path resolution resulted in non-absolute path', {
        context: 'PluginRegistryBuilder',
        plugin: pluginName,
        value: pluginPathValue,
      });
      return null;
    }

    return resolvedPath;
  }

  async _getPluginRegistrationsFromFile(
    mainConfigFilePath,
    basePathDefiningPaths,
    sourceType,
  ) {
    const { fs, loadYamlConfig } = this.dependencies;
    const registrations = {};

    if (!mainConfigFilePath || !fs.existsSync(mainConfigFilePath)) {
      return registrations;
    }

    try {
      const configData = await loadYamlConfig(mainConfigFilePath);
      if (!configData?.plugins || typeof configData.plugins !== 'object') {
        return registrations;
      }

      for (const pluginName in configData.plugins) {
        if (!Object.hasOwn(configData.plugins, pluginName)) continue;

        const pluginPathValue = configData.plugins[pluginName];
        const resolvedPath = this._resolvePluginPath(
          pluginName,
          pluginPathValue,
          basePathDefiningPaths,
        );
        if (!resolvedPath) continue;

        registrations[pluginName] = {
          configPath: resolvedPath,
          definedIn: mainConfigFilePath,
          sourceType,
        };
      }
    } catch (error) {
      logger.error('Error reading plugin registrations from file', {
        context: 'PluginRegistryBuilder',
        file: mainConfigFilePath,
        error: error.message,
      });
    }

    return registrations;
  }

  async buildRegistry() {
    if (this._builtRegistry) {
      return this._builtRegistry.registry;
    }

    const { fs } = this.dependencies;
    const registry = await this._registerBundledPlugins();

    const installedRegistrations = await this._registerInstalledPlugins();
    Object.assign(registry, installedRegistrations);

    if (
      !this.useFactoryDefaultsOnly &&
      fs.existsSync(this.xdgGlobalConfigPath)
    ) {
      const xdgRegistrations = await this._getPluginRegistrationsFromFile(
        this.xdgGlobalConfigPath,
        this.xdgBaseDir,
        'XDG Global',
      );
      Object.assign(registry, xdgRegistrations);
    }

    if (
      !this.useFactoryDefaultsOnly &&
      this.projectManifestConfigPath &&
      typeof this.projectManifestConfigPath === 'string' &&
      fs.existsSync(this.projectManifestConfigPath)
    ) {
      const projectRegistrations = await this._getPluginRegistrationsFromFile(
        this.projectManifestConfigPath,
        this.projectManifestBaseDir,
        'Project Manifest (--config)',
      );
      Object.assign(registry, projectRegistrations);
    }

    this._builtRegistry = {
      registry,
      builtWithFactoryDefaults: this.useFactoryDefaultsOnly,
      projectManifestPathUsed: this.projectManifestConfigPath,
      isLazyLoadMode: this.isLazyLoadMode,
      primaryMainConfigLoadReason: this.primaryMainConfigLoadReason,
      pluginInstallerInstance: this.pluginInstaller,
    };
    return registry;
  }

  async getAllPluginDetails() {
    const { fs, path, loadYamlConfig } = this.dependencies;
    const pluginDetails = [];
    const registry = await this.buildRegistry();

    for (const pluginName of Object.keys(registry)) {
      const regInfo = registry[pluginName];
      let description = 'N/A';

      try {
        if (
          regInfo.configPath &&
          fs.existsSync(regInfo.configPath) &&
          fs.statSync(regInfo.configPath).isFile()
        ) {
          const pluginConfig = await loadYamlConfig(regInfo.configPath);
          description = pluginConfig.description || 'N/A';
        } else {
          description = `Error: Config path '${regInfo.configPath || 'undefined'}' not found.`;
        }
      } catch (error) {
        description = `Error loading config: ${error.message.substring(0, 50)}...`;
      }

      let registrationSourceDisplay = regInfo.sourceType;
      if (regInfo.definedIn) {
        const definedInFilename = path.basename(regInfo.definedIn);
        if (regInfo.sourceType.startsWith('Project Manifest')) {
          registrationSourceDisplay = `Project (--config: ${definedInFilename})`;
        } else if (regInfo.sourceType === 'XDG Global') {
          registrationSourceDisplay = `XDG (${definedInFilename})`;
        } else if (regInfo.sourceType === 'Bundled') {
          registrationSourceDisplay = `Bundled (${definedInFilename})`;
        } else if (regInfo.sourceType === 'Installed') {
          registrationSourceDisplay = `Installed (${regInfo.pluginType || 'added'})`;
        }
      }

      let status = `Registered (${regInfo.sourceType})`;
      if (regInfo.sourceType === 'Installed') {
        status =
          regInfo.isEnabled !== false
            ? 'Enabled (Installed)'
            : 'Available (Installed)';
      } else if (regInfo.sourceType === 'Bundled') {
        status = 'Registered (Bundled)';
      }

      pluginDetails.push({
        name: pluginName,
        description,
        configPath: regInfo.configPath,
        registrationSourceDisplay,
        status,
      });
    }

    return pluginDetails.sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    );
  }
}

module.exports = PluginRegistryBuilder;
