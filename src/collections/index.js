// src/collections/index.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous checks like existsSync
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const { cmUtilsPath, constantsPath, collectionsCommandsRoot, loggerPath } = require('@paths');
const logger = require(loggerPath);

// Internal Utilities
const cmUtils = require(cmUtilsPath);
const constants = require(constantsPath);

// Command Modules
const addCollectionCmd = require(path.join(collectionsCommandsRoot, 'add.js'));
const enablePluginCmd = require(path.join(collectionsCommandsRoot, 'enable.js'));
const enableAllPluginsInCollectionCmd = require(path.join(collectionsCommandsRoot, 'enableAll.js'));
const disablePluginCmd = require(path.join(collectionsCommandsRoot, 'disable.js'));
const removeCollectionCmd = require(path.join(collectionsCommandsRoot, 'remove.js'));
const updateCollectionCmd = require(path.join(collectionsCommandsRoot, 'update.js'));
const updateAllCollectionsCmd = require(path.join(collectionsCommandsRoot, 'updateAll.js'));
const listAvailablePluginsCmd = require(path.join(collectionsCommandsRoot, 'listAvailable.js'));
const listCollectionsCmd = require(path.join(collectionsCommandsRoot, 'list.js'));
const addSingletonPluginCmd = require(path.join(collectionsCommandsRoot, 'addSingleton.js'));

class CollectionsManager {
  constructor(options = {}, dependencies = {}) {
    // Define all default dependencies needed by any command module
    const defaultDependencies = {
      fs, fss, path, os, spawn, fsExtra, yaml, matter,
      cmUtils, constants, process, logger,
    };

    // Merge defaults with any injected dependencies for testing
    this.dependencies = { ...defaultDependencies, ...dependencies };

    this.collRoot = this.determineCollRoot(options.collRootCliOverride, options.collRootFromMainConfig);

    // Bind all commands, passing the 'dependencies' object as the first argument
    this.addCollection = addCollectionCmd.bind(this, this.dependencies);
    this.enablePlugin = enablePluginCmd.bind(this, this.dependencies);
    this.enableAllPluginsInCollection = enableAllPluginsInCollectionCmd.bind(this, this.dependencies);
    this.disablePlugin = disablePluginCmd.bind(this, this.dependencies);
    this.removeCollection = removeCollectionCmd.bind(this, this.dependencies);
    this.updateCollection = updateCollectionCmd.bind(this, this.dependencies);
    this.updateAllCollections = updateAllCollectionsCmd.bind(this, this.dependencies);
    this.listAvailablePlugins = listAvailablePluginsCmd.bind(this, this.dependencies);
    this.listCollections = listCollectionsCmd.bind(this, this.dependencies);
    this.addSingletonPlugin = addSingletonPluginCmd.bind(this, this.dependencies);
  }

  determineCollRoot(collRootCliOverride = null, collRootFromConfig = null) {
    const { process, os, path } = this.dependencies;
    if (collRootCliOverride) {
      return collRootCliOverride;
    }
    if (process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE) {
      return process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE;
    }
    if (process.env.MD_TO_PDF_COLLECTIONS_ROOT) {
      return process.env.MD_TO_PDF_COLLECTIONS_ROOT;
    }
    if (collRootFromConfig) {
      return collRootFromConfig;
    }
    const xdgDataHome = process.env.XDG_DATA_HOME ||
      (os.platform() === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local')
        : path.join(os.homedir(), '.local', 'share'));
    const defaultPath = path.join(xdgDataHome, 'md-to-pdf', 'collections');
    return defaultPath;
  }

  async _readEnabledManifest() {
    const { path, fss, fs, yaml, constants } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, constants.ENABLED_MANIFEST_FILENAME);
    let enabledManifest = { enabled_plugins: [] };
    try {
      if (fss.existsSync(enabledManifestPath)) {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        const loadedData = yaml.load(manifestContent);
        if (loadedData && Array.isArray(loadedData.enabled_plugins)) {
          enabledManifest = loadedData;
        }
      }
    } catch (e) {
      logger.warn(`Could not read or parse ${enabledManifestPath}: ${e.message}. Starting with a new manifest.`, { module: 'src/collections/index.js' });
    }
    return enabledManifest;
  }

  async _writeEnabledManifest(manifestData) {
    const { path, fs, yaml, constants } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, constants.ENABLED_MANIFEST_FILENAME);
    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      const yamlString = yaml.dump(manifestData, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
    } catch (e) {
      logger.error(`Failed to write to ${enabledManifestPath}: ${e.message}`, { module: 'src/collections/index.js' });
      throw e;
    }
  }

  async _readCollectionMetadata(collectionName) {
    const { path, fss, fs, yaml, constants } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, constants.METADATA_FILENAME);
    if (!fss.existsSync(metadataPath)) {
      return null;
    }
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      return yaml.load(metaContent);
    } catch (e) {
      logger.error(`Could not read or parse metadata for "${collectionName}": ${e.message}`, { module: 'src/collections/index.js' });
      throw e;
    }
  }

  async _writeCollectionMetadata(collectionName, metadataContent) {
    const { path, fs, yaml, constants } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, constants.METADATA_FILENAME);
    try {
      await fs.mkdir(collectionPath, { recursive: true });
      const yamlString = yaml.dump(metadataContent);
      await fs.writeFile(metadataPath, yamlString);
    } catch (metaError) {
      logger.warn(`Could not write collection metadata for ${collectionName}: ${metaError.message}`, { module: 'src/collections/index.js' });
      throw metaError;
    }
  }

  async disableAllPluginsFromCollection(collectionIdentifier) {
    const { path,  constants } = this.dependencies;
    const manifest = await this._readEnabledManifest();
    const initialCount = manifest.enabled_plugins.length;
    let userFriendlyName = collectionIdentifier;
    let actualCollectionNameForFilter = collectionIdentifier;
    let specificPluginIdForFilter = null;
    if (collectionIdentifier.startsWith(constants.USER_ADDED_PLUGINS_DIR_NAME + path.sep)) {
      const parts = collectionIdentifier.split(path.sep);
      if (parts.length >= 2 && parts[0] === constants.USER_ADDED_PLUGINS_DIR_NAME) {
        actualCollectionNameForFilter = constants.USER_ADDED_PLUGINS_DIR_NAME;
        specificPluginIdForFilter = parts[1];
        userFriendlyName = `${specificPluginIdForFilter} (from ${constants.USER_ADDED_PLUGINS_DIR_NAME})`;
      }
    }
    const pluginsToKeep = [];
    const disabledInvokeNames = new Set();
    manifest.enabled_plugins.forEach(pluginEntry => {
      let matchesCriteriaForRemoval = false;
      if (specificPluginIdForFilter) {
        if (pluginEntry.collection_name === actualCollectionNameForFilter && pluginEntry.plugin_id === specificPluginIdForFilter) {
          matchesCriteriaForRemoval = true;
        }
      } else {
        if (pluginEntry.collection_name === actualCollectionNameForFilter) {
          matchesCriteriaForRemoval = true;
        }
      }
      if (matchesCriteriaForRemoval) {
        if (!disabledInvokeNames.has(pluginEntry.invoke_name)) {
          logger.detail(`    - Disabling plugin "${pluginEntry.invoke_name}" (from ${pluginEntry.collection_name}/${pluginEntry.plugin_id})`, { module: 'src/collections/index.js' });
          disabledInvokeNames.add(pluginEntry.invoke_name);
        }
      } else {
        pluginsToKeep.push(pluginEntry);
      }
    });
    if (pluginsToKeep.length < initialCount) {
      manifest.enabled_plugins = pluginsToKeep;
      await this._writeEnabledManifest(manifest);
      logger.success(`  Successfully disabled ${initialCount - pluginsToKeep.length} plugin instance(s) originating from "${userFriendlyName}".`, { module: 'src/collections/index.js' });
      return { success: true, disabledCount: initialCount - pluginsToKeep.length };
    } else {
      return { success: true, disabledCount: 0 };
    }
  }

  _spawnGitProcess(gitArgs, cwd, operationDescription) {
    const { spawn, process } = this.dependencies;
    return new Promise((resolve, reject) => {
      const spawnOptions = {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      };
      const gitProcess = spawn('git', gitArgs, spawnOptions);

      let stdout = '';
      let stderr = '';
      gitProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        stdout += dataStr;
      });
      gitProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        // This is debug-level info, using detail.
        logger.detail(`GIT_STDERR (${operationDescription}): ${dataStr}`, { module: 'src/collections/index.js' });
        stderr += dataStr;
      });
      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code, stdout, stderr });
        } else {
          logger.error(`Git operation '${gitArgs.join(' ')}' for ${operationDescription} failed with exit code ${code}.`, { module: 'src/collections/index.js' });
          const error = new Error(`Git ${gitArgs.join(' ')} failed for ${operationDescription} with exit code ${code}.`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });
      gitProcess.on('error', (err) => {
        logger.error(`Failed to start git process for ${operationDescription}: ${err.message}`, { module: 'src/collections/index.js' });
        reject(err);
      });
    });
  }
}

module.exports = CollectionsManager;
