// src/collections/commands/list.js

module.exports = async function listCollections(dependencies, type = 'downloaded', collectionNameFilter = null) {
  const { fss, fs, path, constants, logger } = dependencies;
  const { USER_ADDED_PLUGINS_DIR_NAME } = constants;

  logger.debug('Attempting to list collections', {
    context: 'ListCollectionsCommand',
    listType: type,
    filter: collectionNameFilter || 'none'
  });

  if (type === 'downloaded' || type === 'collections') {
    try {
      if (!fss.existsSync(this.collRoot)) {
        logger.warn('Collections root directory not found', {
          context: 'ListCollectionsCommand',
          collectionsRoot: this.collRoot,
          listType: type,
          suggestion: 'No downloaded collections to list.'
        });
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
                logger.debug('Added singleton container to list', {
                  context: 'ListCollectionsCommand',
                  containerPath: singletonPluginsContainerPath
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
            logger.debug('Added downloaded collection to list', {
              context: 'ListCollectionsCommand',
              collectionName: collectionName,
              hasMetadata: !!metadata
            });
          }
        }
      }
      collectionInfos.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      logger.debug('Successfully listed downloaded collections', {
        context: 'ListCollectionsCommand',
        count: collectionInfos.length
      });
      return collectionInfos;
    } catch (error) {
      logger.error('Error listing downloaded collections', {
        context: 'ListCollectionsCommand',
        listType: type,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  } else if (type === 'available' || type === 'all') {
    logger.info('Listing available plugins', {
      context: 'ListCollectionsCommand',
      filter: collectionNameFilter || 'none'
    });
    return await this.listAvailablePlugins(collectionNameFilter);
  } else if (type === 'enabled') {
    logger.info('Listing enabled plugins', {
      context: 'ListCollectionsCommand',
      filter: collectionNameFilter || 'none'
    });
    const enabledManifest = await this._readEnabledManifest();
    let pluginsFromManifest = enabledManifest.enabled_plugins;

    if (collectionNameFilter) {
      pluginsFromManifest = pluginsFromManifest.filter(p => p.collection_name === collectionNameFilter);
      logger.debug('Filtered enabled plugins by collection name', {
        context: 'ListCollectionsCommand',
        filter: collectionNameFilter,
        count: pluginsFromManifest.length
      });
    }

    const processedEnabledPlugins = [];
    for (const p of pluginsFromManifest) {
      const pluginEntry = { ...p }; // Clone
      if (pluginEntry.original_source && pluginEntry.collection_name === USER_ADDED_PLUGINS_DIR_NAME) {
        if (!fss.existsSync(pluginEntry.original_source)) {
          pluginEntry.is_original_source_missing = true;
          logger.warn('Original source for singleton plugin is missing', {
            context: 'ListCollectionsCommand',
            invokeName: pluginEntry.invoke_name,
            originalSource: pluginEntry.original_source
          });
        }
      }
      processedEnabledPlugins.push(pluginEntry);
    }
    processedEnabledPlugins.sort((a,b) => (a.invoke_name || '').toLowerCase().localeCompare((b.invoke_name || '').toLowerCase()));
    logger.debug('Successfully listed enabled plugins', {
      context: 'ListCollectionsCommand',
      count: processedEnabledPlugins.length
    });
    return processedEnabledPlugins;
  } else {
    logger.warn('Listing type is not implemented', {
      context: 'ListCollectionsCommand',
      listType: type,
      suggestion: 'Supported types are "downloaded", "collections", "available", "all", "enabled".'
    });
    return [];
  }
};
