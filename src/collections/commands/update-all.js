// src/collections/commands/update-all.js

module.exports = async function updateAllCollections(dependencies) {
  const { fss, fs, path, logger, collectionsUserPluginsDirname } = dependencies;

  logger.debug('Initiating update for all collections', {
    context: 'UpdateAllCollectionsCommand'
  });

  let allOverallSuccess = true;
  const updateMessages = [];

  const downloadedCollectionInfos = await this.listCollections('downloaded');

  if (!downloadedCollectionInfos || downloadedCollectionInfos.length === 0) {
    logger.warn('No collections are currently downloaded. Nothing to update.', {
      context: 'UpdateAllCollectionsCommand',
      status: 'No collections downloaded'
    });
    return { success: true, messages: ['No collections downloaded.']};
  }

  logger.debug('Processing updates for downloaded collections', {
    context: 'UpdateAllCollectionsCommand',
    totalCollections: downloadedCollectionInfos.length
  });

  for (const collectionInfo of downloadedCollectionInfos) {
    const collectionName = collectionInfo.name;
    logger.debug('Processing collection for update', {
      context: 'UpdateAllCollectionsCommand',
      collectionName: collectionName
    });

    if (collectionName === collectionsUserPluginsDirname) {
      const singletonsBasePath = path.join(this.collRoot, collectionsUserPluginsDirname);
      logger.debug('Processing user-added plugins container', {
        context: 'UpdateAllCollectionsCommand',
        containerPath: singletonsBasePath
      });
      try {
        if (fss.existsSync(singletonsBasePath) && fss.lstatSync(singletonsBasePath).isDirectory()) {
          const singletonPluginDirs = await fs.readdir(singletonsBasePath, { withFileTypes: true });
          for (const dirent of singletonPluginDirs) {
            if (dirent.isDirectory()) {
              const singletonPluginId = dirent.name;
              const singletonCollectionNameForUpdate = path.join(collectionsUserPluginsDirname, singletonPluginId);

              logger.debug('Processing individual singleton plugin for update', {
                context: 'UpdateAllCollectionsCommand',
                pluginId: singletonPluginId,
                collectionIdentifier: singletonCollectionNameForUpdate
              });
              try {
                const result = await this.updateCollection(singletonCollectionNameForUpdate);
                updateMessages.push(result.message);
                if (!result.success) {
                  allOverallSuccess = false;
                  logger.warn('Singleton plugin update failed', {
                    context: 'UpdateAllCollectionsCommand',
                    pluginId: singletonPluginId,
                    collectionIdentifier: singletonCollectionNameForUpdate,
                    message: result.message
                  });
                } else {
                  logger.info(`Singleton plugin updated successfully: ${singletonPluginId}`, {
                    context: 'UpdateAllCollectionsCommand',
                    collectionIdentifier: singletonCollectionNameForUpdate
                  });
                }
              } catch (singletonError) {
                const errMsg = `Failed to process update for singleton ${singletonCollectionNameForUpdate}: ${singletonError.message}`;
                logger.error('Failed to process update for singleton plugin', {
                  context: 'UpdateAllCollectionsCommand',
                  collectionIdentifier: singletonCollectionNameForUpdate,
                  error: singletonError.message,
                  stack: singletonError.stack
                });
                updateMessages.push(errMsg);
                allOverallSuccess = false;
              }
            }
          }
        } else {
          logger.info(`User-added plugins directory does not exist: ${singletonsBasePath}, skipping.`, {
            context: 'UpdateAllCollectionsCommand'
          });
        }
      } catch (error) {
        const errMsg = `Error processing directory ${collectionsUserPluginsDirname}: ${error.message}`;
        logger.error('Error processing user-added plugins directory', {
          context: 'UpdateAllCollectionsCommand',
          directory: collectionsUserPluginsDirname,
          error: error.message,
          stack: error.stack
        });
        updateMessages.push(errMsg);
        allOverallSuccess = false;
      }
      continue;
    }

    // Process regular collections
    try {
      const result = await this.updateCollection(collectionName);
      updateMessages.push(result.message);
      if (!result.success) {
        allOverallSuccess = false;
        logger.warn('Collection update failed', {
          context: 'UpdateAllCollectionsCommand',
          collectionName: collectionName,
          message: result.message
        });
      } else {
        logger.debug('Collection updated successfully', {
          context: 'UpdateAllCollectionsCommand',
          collectionName: collectionName
        });
      }
    } catch (error) {
      const errMsg = `Failed to process update for ${collectionName}: ${error.message}`;
      logger.error('Failed to process update for collection', {
        context: 'UpdateAllCollectionsCommand',
        collectionName: collectionName,
        error: error.message,
        stack: error.stack
      });
      updateMessages.push(errMsg);
      allOverallSuccess = false;
    }
  }
  logger.debug('Finished attempting to update all collections.', {
    context: 'UpdateAllCollectionsCommand',
    overallSuccess: allOverallSuccess
  });
  return { success: allOverallSuccess, messages: updateMessages };
};
