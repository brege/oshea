// src/collections/index.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const {
  cmUtilsPath,
  loggerPath,
  addPath,
  enablePath,
  enableAllPath,
  disablePath,
  removePath,
  updatePath,
  updateAllPath,
  listAvailablePath,
  listPath,
  addSingletonPath,
  collectionsMetadataFilename,
  collectionsEnabledManifestFilename,
  collectionsDefaultArchetypeDirname,
  collectionsUserPluginsDirname
} = require('@paths');
const logger = require(loggerPath);

// Internal Utilities
const cmUtils = require(cmUtilsPath);

// Command Modules
const addCollectionCommand = require(addPath);
const enablePluginCommand = require(enablePath);
const enableAllPluginsInCollectionCommand = require(enableAllPath);
const disablePluginCommand = require(disablePath);
const removeCollectionCommand = require(removePath);
const updateCollectionCommand = require(updatePath);
const updateAllCollectionsCommand = require(updateAllPath);
const listAvailablePluginsCommand = require(listAvailablePath);
const listCollectionsCommand = require(listPath);
const addSingletonPluginCommand = require(addSingletonPath);

class CollectionsManager {
  constructor(options = {}, dependencies = {}) {
    // Define all default dependencies needed by any command module
    const defaultDependencies = {
      fs, fss, path, os, spawn, fsExtra, yaml, matter,
      cmUtils, process, logger,
      collectionsMetadataFilename,
      collectionsEnabledManifestFilename,
      collectionsUserPluginsDirname,
      collectionsDefaultArchetypeDirname
    };

    // Merge defaults with any injected dependencies for testing
    this.dependencies = { ...defaultDependencies, ...dependencies };

    this.collRoot = this.determineCollRoot(options.collRootCliOverride, options.collRootFromMainConfig);
    logger.debug('CollectionsManager initialized', {
      context: 'CollectionsManager',
      collectionsRoot: this.collRoot
    });

    // Bind all commands, passing the 'dependencies' object as the first argument
    this.addCollection = addCollectionCommand.bind(this, this.dependencies);
    this.enablePlugin = enablePluginCommand.bind(this, this.dependencies);
    this.enableAllPluginsInCollection = enableAllPluginsInCollectionCommand.bind(this, this.dependencies);
    this.disablePlugin = disablePluginCommand.bind(this, this.dependencies);
    this.removeCollection = removeCollectionCommand.bind(this, this.dependencies);
    this.updateCollection = updateCollectionCommand.bind(this, this.dependencies);
    this.updateAllCollections = updateAllCollectionsCommand.bind(this, this.dependencies);
    this.listAvailablePlugins = listAvailablePluginsCommand.bind(this, this.dependencies);
    this.listCollections = listCollectionsCommand.bind(this, this.dependencies);
    this.addSingletonPlugin = addSingletonPluginCommand.bind(this, this.dependencies);
  }

  determineCollRoot(collRootCliOverride = null, collRootFromConfig = null) {
    const { process, os, path } = this.dependencies;
    let resolvedRoot;

    if (collRootCliOverride) {
      resolvedRoot = collRootCliOverride;
      logger.debug('Collections root derived from CLI override', {
        context: 'CollectionsManager',
        root: resolvedRoot
      });
    } else if (process.env.OSHEA_COLL_ROOT_TEST_OVERRIDE) {
      resolvedRoot = process.env.OSHEA_COLL_ROOT_TEST_OVERRIDE;
      logger.debug('Collections root derived from test environment override', {
        context: 'CollectionsManager',
        root: resolvedRoot
      });
    } else if (process.env.OSHEA_COLLECTIONS_ROOT) {
      resolvedRoot = process.env.OSHEA_COLLECTIONS_ROOT;
      logger.debug('Collections root derived from environment variable', {
        context: 'CollectionsManager',
        root: resolvedRoot
      });
    } else if (collRootFromConfig) {
      resolvedRoot = collRootFromConfig;
      logger.debug('Collections root derived from main config', {
        context: 'CollectionsManager',
        root: resolvedRoot
      });
    } else {
      const xdgDataHome = process.env.XDG_DATA_HOME ||
        (os.platform() === 'win32'
          ? path.join(os.homedir(), 'AppData', 'Local')
          : path.join(os.homedir(), '.local', 'share'));
      resolvedRoot = path.join(xdgDataHome, 'oshea');
      logger.debug('Collections root using XDG default path', {
        context: 'CollectionsManager',
        root: resolvedRoot
      });
    }
    return resolvedRoot;
  }

  async _readEnabledManifest() {
    const { path, fss, fs, yaml } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, collectionsEnabledManifestFilename);
    let enabledManifest = { enabled_plugins: [] };
    logger.debug('Attempting to read enabled manifest', {
      context: 'CollectionsManager',
      path: enabledManifestPath
    });
    try {
      if (fss.existsSync(enabledManifestPath)) {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        const loadedData = yaml.load(manifestContent);
        if (loadedData && Array.isArray(loadedData.enabled_plugins)) {
          enabledManifest = loadedData;
          logger.debug('Enabled manifest loaded successfully', {
            context: 'CollectionsManager',
            path: enabledManifestPath,
            pluginCount: loadedData.enabled_plugins.length
          });
        } else {
          logger.warn('Enabled manifest file exists but is empty or invalid', {
            context: 'CollectionsManager',
            path: enabledManifestPath,
            suggestion: 'Starting with a new manifest structure.'
          });
        }
      } else {
        logger.debug('Enabled manifest file not found', {
          context: 'CollectionsManager',
          path: enabledManifestPath,
          suggestion: 'Starting with a new, empty manifest.'
        });
      }
    } catch (e) {
      logger.warn('Could not read or parse enabled manifest', {
        context: 'CollectionsManager',
        file: enabledManifestPath,
        error: e.message,
        suggestion: 'Starting with a new manifest.'
      });
    }
    return enabledManifest;
  }

  async _writeEnabledManifest(manifestData) {
    const { path, fs, yaml } = this.dependencies;
    const enabledManifestPath = path.join(this.collRoot, collectionsEnabledManifestFilename);
    logger.debug('Attempting to write enabled manifest', {
      context: 'CollectionsManager',
      path: enabledManifestPath
    });
    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      const yamlString = yaml.dump(manifestData, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
      logger.debug('Enabled manifest written successfully', {
        context: 'CollectionsManager',
        path: enabledManifestPath,
        pluginCount: manifestData.enabled_plugins ? manifestData.enabled_plugins.length : 0
      });
    } catch (e) {
      logger.error('Failed to write enabled manifest', {
        context: 'CollectionsManager',
        file: enabledManifestPath,
        error: e.message,
        operation: 'writeEnabledManifest'
      });
      throw e;
    }
  }

  async _readCollectionMetadata(collectionName) {
    const { path, fss, fs, yaml } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, collectionsMetadataFilename);
    logger.debug('Attempting to read collection metadata', {
      context: 'CollectionsManager',
      collection: collectionName,
      path: metadataPath
    });
    if (!fss.existsSync(metadataPath)) {
      logger.debug('Collection metadata file not found', {
        context: 'CollectionsManager',
        collection: collectionName,
        path: metadataPath
      });

      // Check for .source.yaml (archetyped plugins)
      const sourceMetadataPath = path.join(collectionPath, '.source.yaml');
      if (fss.existsSync(sourceMetadataPath)) {
        try {
          const sourceContent = await fs.readFile(sourceMetadataPath, 'utf8');
          const sourceMetadata = yaml.load(sourceContent);
          logger.debug('Found source metadata for archetyped plugin', {
            context: 'CollectionsManager',
            collection: collectionName,
            path: sourceMetadataPath,
            sourceType: sourceMetadata.source_type
          });
          // Return a special marker indicating this is not updatable
          return {
            isArchetyped: true,
            source_type: sourceMetadata.source_type,
            created_from: sourceMetadata.created_from,
            archetype_source: sourceMetadata.archetype_source,
            created_on: sourceMetadata.created_on
          };
        } catch (e) {
          logger.error('Could not read or parse source metadata', {
            context: 'CollectionsManager',
            collection: collectionName,
            file: sourceMetadataPath,
            error: e.message,
            operation: 'readCollectionMetadata'
          });
          throw e;
        }
      }

      return null;
    }
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = yaml.load(metaContent);
      logger.debug('Collection metadata loaded successfully', {
        context: 'CollectionsManager',
        collection: collectionName,
        path: metadataPath
      });
      return metadata;
    } catch (e) {
      logger.error('Could not read or parse collection metadata', {
        context: 'CollectionsManager',
        collection: collectionName,
        file: metadataPath,
        error: e.message,
        operation: 'readCollectionMetadata'
      });
      throw e;
    }
  }

  async _writeCollectionMetadata(collectionName, metadataContent) {
    const { path, fs, yaml } = this.dependencies;
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, collectionsMetadataFilename);
    logger.debug('Attempting to write collection metadata', {
      context: 'CollectionsManager',
      collection: collectionName,
      path: metadataPath
    });
    try {
      await fs.mkdir(collectionPath, { recursive: true });
      const yamlString = yaml.dump(metadataContent);
      await fs.writeFile(metadataPath, yamlString);
      logger.debug('Collection metadata written successfully', {
        context: 'CollectionsManager',
        collection: collectionName,
        path: metadataPath
      });
    } catch (metaError) {
      logger.warn('Could not write collection metadata', {
        context: 'CollectionsManager',
        collection: collectionName,
        file: metadataPath,
        error: metaError.message,
        operation: 'writeCollectionMetadata',
        suggestion: 'Check file permissions or path validity.'
      });
      throw metaError;
    }
  }

  async _addToUserPluginsManifest(userPluginsDir, pluginId, invokeName, sourcePath) {
    const { path, fs, fss, yaml } = this.dependencies;
    const pluginsManifestPath = path.join(userPluginsDir, 'plugins.yaml');

    let pluginStates = {};

    // Read existing manifest if it exists
    if (fss.existsSync(pluginsManifestPath)) {
      try {
        const content = await fs.readFile(pluginsManifestPath, 'utf8');
        const parsed = yaml.load(content);
        pluginStates = parsed?.plugins || {};
      } catch (e) {
        logger.warn('Could not read existing plugins manifest', {
          context: 'CollectionsManager',
          path: pluginsManifestPath,
          error: e.message
        });
      }
    }

    // Add the new plugin
    pluginStates[pluginId] = {
      type: 'added',
      enabled: true,
      added_from: sourcePath,
      added_on: new Date().toISOString()
    };

    // Write updated manifest
    const updatedManifest = {
      version: '1.0',
      plugins: pluginStates
    };

    await fs.writeFile(pluginsManifestPath, yaml.dump(updatedManifest));

    logger.debug('Added plugin to unified manifest', {
      context: 'CollectionsManager',
      pluginId: pluginId,
      invokeName: invokeName,
      manifestPath: pluginsManifestPath
    });
  }

  async disableAllPluginsFromCollection(collectionIdentifier) {
    const { path, logger } = this.dependencies;
    const manifest = await this._readEnabledManifest();
    const initialCount = manifest.enabled_plugins.length;
    let userFriendlyName = collectionIdentifier;
    let actualCollectionNameForFilter = collectionIdentifier;
    let specificPluginIdForFilter = null;

    logger.debug('Attempting to disable plugins from collection', {
      context: 'CollectionsManager',
      collectionIdentifier: collectionIdentifier
    });

    if (collectionIdentifier.startsWith(collectionsUserPluginsDirname + path.sep)) {
      const parts = collectionIdentifier.split(path.sep);
      if (parts.length >= 2 && parts[0] === collectionsUserPluginsDirname) {
        actualCollectionNameForFilter = collectionsUserPluginsDirname;
        specificPluginIdForFilter = parts[1];
        userFriendlyName = `${specificPluginIdForFilter} (from ${collectionsUserPluginsDirname})`;
        logger.debug('Disabling a specific user-added plugin', {
          context: 'CollectionsManager',
          pluginId: specificPluginIdForFilter,
          collectionName: actualCollectionNameForFilter
        });
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
          logger.debug('Disabling plugin instance', {
            context: 'CollectionsManager',
            invokeName: pluginEntry.invoke_name,
            collectionName: pluginEntry.collection_name,
            pluginId: pluginEntry.plugin_id
          });
          disabledInvokeNames.add(pluginEntry.invoke_name);
        }
      } else {
        pluginsToKeep.push(pluginEntry);
      }
    });

    if (pluginsToKeep.length < initialCount) {
      manifest.enabled_plugins = pluginsToKeep;
      await this._writeEnabledManifest(manifest);
      logger.success('Successfully disabled plugin instance(s)', {
        context: 'CollectionsManager',
        disabledCount: initialCount - pluginsToKeep.length,
        origin: userFriendlyName
      });
      return { success: true, disabledCount: initialCount - pluginsToKeep.length };
    } else {
      logger.info('No plugin instances found or disabled for collection', {
        context: 'CollectionsManager',
        collectionIdentifier: collectionIdentifier,
        status: 'No changes made to manifest.'
      });
      return { success: true, disabledCount: 0 };
    }
  }

  _spawnGitProcess(gitArgs, cwd, operationDescription) {
    const { spawn, process, logger } = this.dependencies;
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
        logger.debug('Git stdout', {
          context: 'CollectionsManager',
          operation: operationDescription,
          output: dataStr.trim()
        });
      });
      gitProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        stderr += dataStr;
        logger.debug('Git stderr', {
          context: 'CollectionsManager',
          operation: operationDescription,
          output: dataStr.trim()
        });
      });
      gitProcess.on('close', (code) => {
        if (code === 0) {
          logger.debug('Git operation completed successfully', {
            context: 'CollectionsManager',
            command: gitArgs.join(' '),
            operation: operationDescription,
            exitCode: code
          });
          resolve({ success: true, code, stdout, stderr });
        } else {
          logger.error('Git operation failed', {
            context: 'CollectionsManager',
            command: gitArgs.join(' '),
            operation: operationDescription,
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
          const error = new Error(`Git ${gitArgs.join(' ')} failed for ${operationDescription} with exit code ${code}.`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });
      gitProcess.on('error', (err) => {
        logger.error('Failed to start git process', {
          context: 'CollectionsManager',
          operation: operationDescription,
          command: gitArgs.join(' '),
          error: err.message,
          stack: err.stack
        });
        reject(err);
      });
    });
  }
}

module.exports = CollectionsManager;
