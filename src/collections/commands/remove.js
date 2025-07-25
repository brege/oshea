// src/collections/commands/remove.js

module.exports = async function removeCollection(dependencies, collectionName, options = {}) {
  const { fss, path, fsExtra, constants, logger } = dependencies;

  logger.info('Attempting to remove collection', {
    context: 'RemoveCollectionCommand',
    collectionName: collectionName,
    options: options
  });

  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    logger.warn('Collection path does not exist', {
      context: 'RemoveCollectionCommand',
      collectionPath: collectionPath,
      collectionName: collectionName,
      suggestion: 'Will proceed to check manifest for cleanup if --force is used.'
    });
  } else if (!fss.lstatSync(collectionPath).isDirectory()) {
    logger.error('Target is not a directory', {
      context: 'RemoveCollectionCommand',
      collectionName: collectionName,
      collectionPath: collectionPath,
      error: `Target "${collectionName}" at ${collectionPath} is not a directory.`
    });
    throw new Error(`Target "${collectionName}" at ${collectionPath} is not a directory.`);
  }

  const enabledManifest = await this._readEnabledManifest();
  let pluginsFromThisCollectionCount = 0;

  let actualCollectionNameForFilterCheck = collectionName;
  let specificPluginIdForFilterCheck = null;

  if (collectionName.startsWith(constants.USER_ADDED_PLUGINS_DIR_NAME + path.sep)) {
    const parts = collectionName.split(path.sep);
    if (parts.length === 2 && parts[0] === constants.USER_ADDED_PLUGINS_DIR_NAME) {
      actualCollectionNameForFilterCheck = constants.USER_ADDED_PLUGINS_DIR_NAME;
      specificPluginIdForFilterCheck = parts[1];
      logger.debug('Identified as specific user-added plugin for removal', {
        context: 'RemoveCollectionCommand',
        pluginId: specificPluginIdForFilterCheck
      });
    }
  }

  pluginsFromThisCollectionCount = enabledManifest.enabled_plugins.filter(p => {
    if (specificPluginIdForFilterCheck) {
      return p.collection_name === actualCollectionNameForFilterCheck && p.plugin_id === specificPluginIdForFilterCheck;
    }
    return p.collection_name === actualCollectionNameForFilterCheck;
  }).length;

  if (pluginsFromThisCollectionCount > 0 && !options.force) {
    const enabledPluginsDetails = enabledManifest.enabled_plugins.filter(p => {
      if (specificPluginIdForFilterCheck) {
        return p.collection_name === actualCollectionNameForFilterCheck && p.plugin_id === specificPluginIdForFilterCheck;
      }
      return p.collection_name === actualCollectionNameForFilterCheck;
    }).map(p => `"${p.invoke_name}" (from ${p.collection_name}/${p.plugin_id})`).join(', ');

    logger.error('Collection has enabled plugins and --force not used', {
      context: 'RemoveCollectionCommand',
      collectionName: collectionName,
      enabledPlugins: enabledPluginsDetails,
      error: `Collection "${collectionName}" has enabled plugins: ${enabledPluginsDetails}. Please disable them first or use the --force option.`
    });
    throw new Error(`Collection "${collectionName}" has enabled plugins: ${enabledPluginsDetails}. Please disable them first or use the --force option.`);
  }

  if (options.force && pluginsFromThisCollectionCount > 0) {
    logger.warn('Force removing collection, disabling associated plugins first', {
      context: 'RemoveCollectionCommand',
      collectionName: collectionName,
      enabledPluginsCount: pluginsFromThisCollectionCount
    });
    await this.disableAllPluginsFromCollection(collectionName);
    logger.info('Associated plugins disabled due to --force flag', {
      context: 'RemoveCollectionCommand',
      collectionName: collectionName
    });
  }

  if (fss.existsSync(collectionPath) && fss.lstatSync(collectionPath).isDirectory()) {
    try {
      await fsExtra.rm(collectionPath, { recursive: true, force: true });
      logger.success('Collection directory removed successfully', {
        context: 'RemoveCollectionCommand',
        collectionName: collectionName,
        path: collectionPath,
        root: this.collRoot
      });
    } catch (error) {
      logger.error('Failed to remove collection directory', {
        context: 'RemoveCollectionCommand',
        collectionName: collectionName,
        collectionPath: collectionPath,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  } else {
    logger.info('Collection directory not found for physical removal, assuming already removed or non-existent.', {
      context: 'RemoveCollectionCommand',
      collectionName: collectionName,
      collectionPath: collectionPath
    });
  }

  return { success: true, message: `Collection "${collectionName}" processed for removal.` };
};
