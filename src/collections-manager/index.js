// src/collections-manager/index.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous checks like existsSync
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const matter = require('gray-matter');

// Internal Utilities
const cmUtils = require('./cm-utils');
const constants = require('./constants');

// Command Modules
const addCollectionCmd = require('./commands/add');
const enablePluginCmd = require('./commands/enable');
const enableAllPluginsInCollectionCmd = require('./commands/enableAll');
const disablePluginCmd = require('./commands/disable');
const removeCollectionCmd = require('./commands/remove');
const updateCollectionCmd = require('./commands/update');
const updateAllCollectionsCmd = require('./commands/updateAll');
const listAvailablePluginsCmd = require('./commands/listAvailable');
const listCollectionsCmd = require('./commands/list');
const archetypePluginCmd = require('./commands/archetype');
const addSingletonPluginCmd = require('./commands/addSingleton');

class CollectionsManager {
  constructor(options = {}, dependencies = {}) {
    // Define all default dependencies needed by any command module
    const defaultDependencies = {
      fs, fss, path, os, spawn, fsExtra, chalk, yaml, matter,
      cmUtils, constants, process,
    };

    // Merge defaults with any injected dependencies for testing
    this.dependencies = { ...defaultDependencies, ...dependencies };

    this.debug = options.debug || false;
    this.collRoot = this.determineCollRoot(options.collRootCliOverride, options.collRootFromMainConfig);

    if (this.debug) {
      console.log(this.dependencies.chalk.magenta(`DEBUG (CollectionsManager): Initialized. Final COLL_ROOT: ${this.collRoot}`));
    }

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
    this.archetypePlugin = archetypePluginCmd.bind(this, this.dependencies);
    this.addSingletonPlugin = addSingletonPluginCmd.bind(this, this.dependencies);
  }

  determineCollRoot(collRootCliOverride = null, collRootFromConfig = null) {
    const { chalk, process, os, path } = this.dependencies;
    if (collRootCliOverride) {
      if (this.debug) console.log(chalk.yellowBright(`DEBUG (CM.determineCollRoot): Using CLI override --coll-root for COLL_ROOT: ${collRootCliOverride}`));
      return collRootCliOverride;
    }
    if (process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE) {
      if (this.debug) console.log(chalk.yellowBright(`DEBUG (CM.determineCollRoot): Using test override MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE for COLL_ROOT: ${process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE}`));
      return process.env.MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE;
    }
    if (process.env.MD_TO_PDF_COLLECTIONS_ROOT) {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM.determineCollRoot): Using env var MD_TO_PDF_COLLECTIONS_ROOT for COLL_ROOT: ${process.env.MD_TO_PDF_COLLECTIONS_ROOT}`));
      return process.env.MD_TO_PDF_COLLECTIONS_ROOT;
    }
    if (collRootFromConfig) {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM.determineCollRoot): Using collRootFromMainConfig for COLL_ROOT: ${collRootFromConfig}`));
      return collRootFromConfig;
    }
    const xdgDataHome = process.env.XDG_DATA_HOME ||
      (os.platform() === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local')
        : path.join(os.homedir(), '.local', 'share'));
    const defaultPath = path.join(xdgDataHome, 'md-to-pdf', 'collections');
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM.determineCollRoot): Using XDG/OS default for COLL_ROOT. Base: ${xdgDataHome}, Full Path: ${defaultPath}`));
    return defaultPath;
  }

  async _readEnabledManifest() {
    const { path, fss, fs, yaml, chalk, constants } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, constants.ENABLED_MANIFEST_FILENAME);
    let enabledManifest = { enabled_plugins: [] };
    try {
      if (fss.existsSync(enabledManifestPath)) {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        const loadedData = yaml.load(manifestContent);
        if (loadedData && Array.isArray(loadedData.enabled_plugins)) {
          enabledManifest = loadedData;
        } else {
          if (this.debug && loadedData) console.warn(chalk.yellow(`WARN (CM:_readEnabledManifest): Invalid structure in ${constants.ENABLED_MANIFEST_FILENAME}. Re-initializing.`));
        }
      } else {
        if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_readEnabledManifest): ${constants.ENABLED_MANIFEST_FILENAME} not found. Initializing new one.`));
      }
    } catch (e) {
      console.warn(chalk.yellow(`WARN (CM:_readEnabledManifest): Could not read or parse ${enabledManifestPath}: ${e.message}. Starting with a new manifest.`));
    }
    return enabledManifest;
  }

  async _writeEnabledManifest(manifestData) {
    const { path, fs, yaml, chalk, constants } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, constants.ENABLED_MANIFEST_FILENAME);
    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      const yamlString = yaml.dump(manifestData, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_writeEnabledManifest): Successfully wrote to ${enabledManifestPath}`));
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:_writeEnabledManifest): Failed to write to ${enabledManifestPath}: ${e.message}`));
      throw e;
    }
  }

  async _readCollectionMetadata(collectionName) {
    const { path, fss, fs, yaml, chalk, constants } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, constants.METADATA_FILENAME);
    if (!fss.existsSync(metadataPath)) {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_readCollMeta): Metadata file not found for ${collectionName} at ${metadataPath}`));
      return null;
    }
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      return yaml.load(metaContent);
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:_readCollMeta): Could not read or parse metadata for "${collectionName}": ${e.message}`));
      throw e;
    }
  }

  async _writeCollectionMetadata(collectionName, metadataContent) {
    const { path, fs, yaml, chalk, constants } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, constants.METADATA_FILENAME);
    try {
      await fs.mkdir(collectionPath, { recursive: true });
      const yamlString = yaml.dump(metadataContent);
      await fs.writeFile(metadataPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_writeCollMeta): Wrote metadata to ${metadataPath}`));
    } catch (metaError) {
      console.warn(chalk.yellow(`WARN (CM:_writeCollMeta): Could not write collection metadata for ${collectionName}: ${metaError.message}`));
      throw metaError;
    }
  }

  async disableAllPluginsFromCollection(collectionIdentifier) {
    const { path, chalk, constants } = this.dependencies;
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
             console.log(chalk.gray(`    - Disabling plugin "${pluginEntry.invoke_name}" (from ${pluginEntry.collection_name}/${pluginEntry.plugin_id})`));
             disabledInvokeNames.add(pluginEntry.invoke_name);
        }
      } else {
        pluginsToKeep.push(pluginEntry);
      }
    });
    if (pluginsToKeep.length < initialCount) {
      manifest.enabled_plugins = pluginsToKeep;
      await this._writeEnabledManifest(manifest);
      console.log(chalk.green(`  Successfully disabled ${initialCount - pluginsToKeep.length} plugin instance(s) originating from "${userFriendlyName}".`));
      return { success: true, disabledCount: initialCount - pluginsToKeep.length };
    } else {
      if (this.debug) {
          console.log(chalk.yellow(`  No active plugins found originating from "${userFriendlyName}" to disable.`));
      }
      return { success: true, disabledCount: 0 };
    }
  }

  _spawnGitProcess(gitArgs, cwd, operationDescription) {
    const { spawn, chalk, process } = this.dependencies;
    return new Promise((resolve, reject) => {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_spawnGit): Spawning git with args: [${gitArgs.join(' ')}] in ${cwd} for ${operationDescription}`));
      const gitProcess = spawn('git', gitArgs, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      gitProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        if (!(gitArgs.includes('status') && gitArgs.includes('--porcelain')) &&
            !(gitArgs.includes('rev-list') && gitArgs.includes('--count')) ||
            this.debug) {
            if (this.debug) process.stdout.write(chalk.gray(`  GIT_STDOUT (${operationDescription}): ${dataStr}`));
        }
        stdout += dataStr;
      });
      gitProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        process.stderr.write(chalk.yellowBright(`  GIT_STDERR (${operationDescription}): ${dataStr}`));
        stderr += dataStr;
      });
      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code, stdout, stderr });
        } else {
          console.error(chalk.red(`\n  ERROR: Git operation '${gitArgs.join(' ')}' for ${operationDescription} failed with exit code ${code}.`));
          const error = new Error(`Git ${gitArgs.join(' ')} failed for ${operationDescription} with exit code ${code}.`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });
      gitProcess.on('error', (err) => {
        console.error(chalk.red(`\n  ERROR: Failed to start git process for ${operationDescription}: ${err.message}`));
        reject(err);
      });
    });
  }
}

module.exports = CollectionsManager;
