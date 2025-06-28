// src/collections/commands/remove.js
// No longer requires fs, path, fs-extra, chalk, or constants

module.exports = async function removeCollection(dependencies, collectionName, options = {}) {
  // Destructure dependencies for cleaner code
  const { fss, path, fsExtra, chalk, constants } = dependencies;

  // 'this' is the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection): Removing collection: ${collectionName}, options: ${JSON.stringify(options)}`));
  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    if (this.debug) console.log(chalk.yellow(`WARN (CM:removeCollection): Collection path ${collectionPath} does not exist. Will proceed to check manifest for cleanup if --force is used.`));
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
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection --force): Calling disableAllPluginsFromCollection for "${collectionName}"`));
    await this.disableAllPluginsFromCollection(collectionName);
  } else if (options.force && pluginsFromThisCollectionCount === 0) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection --force): No enabled plugins found for "${collectionName}", manifest not changed by disable step.`));
  }

  if (fss.existsSync(collectionPath) && fss.lstatSync(collectionPath).isDirectory()) {
    try {
      await fsExtra.rm(collectionPath, { recursive: true, force: true });
      console.log(chalk.green(`Collection directory "${collectionName}" removed successfully from ${this.collRoot}.`));
    } catch (error) {
      console.error(chalk.red(`ERROR (CM:removeCollection): Failed to remove collection directory ${collectionPath}: ${error.message}`));
      throw error;
    }
  } else {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection): Collection directory ${collectionPath} did not exist or was not a directory. No file system removal needed.`));
  }
  
  return { success: true, message: `Collection "${collectionName}" processed for removal.` };
};
