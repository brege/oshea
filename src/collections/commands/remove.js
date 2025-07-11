// src/collections/commands/remove.js

module.exports = async function removeCollection(dependencies, collectionName, options = {}) {
  const { fss, path, fsExtra, constants, logger } = dependencies;

  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    logger.warn(`Collection path ${collectionPath} does not exist. Will proceed to check manifest for cleanup if --force is used.`, { module: 'src/collections/commands/remove.js' });
  } else if (!fss.lstatSync(collectionPath).isDirectory()) {
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
    throw new Error(`Collection "${collectionName}" has enabled plugins: ${enabledPluginsDetails}. Please disable them first or use the --force option.`);
  }

  if (options.force && pluginsFromThisCollectionCount > 0) {
    await this.disableAllPluginsFromCollection(collectionName);
  }

  if (fss.existsSync(collectionPath) && fss.lstatSync(collectionPath).isDirectory()) {
    try {
      await fsExtra.rm(collectionPath, { recursive: true, force: true });
      logger.success(`Collection directory "${collectionName}" removed successfully from ${this.collRoot}.`, { module: 'src/collections/commands/remove.js' });
    } catch (error) {
      logger.error(`Failed to remove collection directory ${collectionPath}: ${error.message}`, { module: 'src/collections/commands/remove.js' });
      throw error;
    }
  }

  return { success: true, message: `Collection "${collectionName}" processed for removal.` };
};
