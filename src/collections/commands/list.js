// src/collections/commands/list.js

module.exports = async function listCollections(dependencies, type = 'downloaded', collectionNameFilter = null) {
  const { fss, fs, path, constants, logger } = dependencies;
  const { USER_ADDED_PLUGINS_DIR_NAME } = constants;

  if (type === 'downloaded' || type === 'collections') {
    try {
      if (!fss.existsSync(this.collRoot)) {
        return [];
      }
      const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
      const collectionInfos = [];

      for (const dirent of entries) {
        if (dirent.isDirectory()) {
          const collectionName = dirent.name;
          if (collectionName === USER_ADDED_PLUGINS_DIR_NAME) {
            const singletonPluginsContainerPath = path.join(this.collRoot, USER_ADDED_PLUGINS_DIR_NAME);
            if (fss.existsSync(singletonPluginsContainerPath)) {
              const singletons = await fs.readdir(singletonPluginsContainerPath, { withFileTypes: true });
              if (singletons.some(sDirent => sDirent.isDirectory())) {
                collectionInfos.push({
                  name: USER_ADDED_PLUGINS_DIR_NAME,
                  source: singletonPluginsContainerPath,
                  special_type: 'singleton_container',
                  added_on: 'N/A (Container)',
                  updated_on: undefined
                });
              }
            }
          } else {
            const metadata = await this._readCollectionMetadata(collectionName);
            collectionInfos.push({
              name: collectionName,
              source: metadata?.source || 'N/A (Metadata missing or unreadable)',
              added_on: metadata?.added_on || 'N/A',
              updated_on: metadata?.updated_on
            });
          }
        }
      }
      collectionInfos.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return collectionInfos;
    } catch (error) {
      logger.error(`Error listing downloaded collections: ${error.message}`, { module: 'src/collections/commands/list.js' });
      throw error;
    }
  } else if (type === 'available' || type === 'all') {
    return await this.listAvailablePlugins(collectionNameFilter);
  } else if (type === 'enabled') {
    const enabledManifest = await this._readEnabledManifest();
    let pluginsFromManifest = enabledManifest.enabled_plugins;

    if (collectionNameFilter) {
      pluginsFromManifest = pluginsFromManifest.filter(p => p.collection_name === collectionNameFilter);
    }

    const processedEnabledPlugins = [];
    for (const p of pluginsFromManifest) {
      const pluginEntry = { ...p }; // Clone
      if (pluginEntry.original_source && pluginEntry.collection_name === USER_ADDED_PLUGINS_DIR_NAME) {
        if (!fss.existsSync(pluginEntry.original_source)) {
          pluginEntry.is_original_source_missing = true;
        }
      }
      processedEnabledPlugins.push(pluginEntry);
    }
    processedEnabledPlugins.sort((a,b) => (a.invoke_name || '').toLowerCase().localeCompare((b.invoke_name || '').toLowerCase()));
    return processedEnabledPlugins;
  } else {
    logger.warn(`Listing for type '${type}' is not implemented in manager's listCollections method.`, { module: 'src/collections/commands/list.js' });
    return [];
  }
};
