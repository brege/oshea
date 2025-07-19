// src/collections/commands/update-all.js

module.exports = async function updateAllCollections(dependencies) {
  const { fss, fs, path, constants, logger } = dependencies;
  const { USER_ADDED_PLUGINS_DIR_NAME } = constants;

  let allOverallSuccess = true;
  const updateMessages = [];

  const downloadedCollectionInfos = await this.listCollections('downloaded');

  if (!downloadedCollectionInfos || downloadedCollectionInfos.length === 0) {
    logger.warn('No collections are currently downloaded. Nothing to update.', { module: 'src/collections/commands/updateAll.js' });
    return { success: true, messages: ['No collections downloaded.']};
  }

  logger.info('Processing updates for downloaded collections:', { module: 'src/collections/commands/updateAll.js' });

  for (const collectionInfo of downloadedCollectionInfos) {
    const collectionName = collectionInfo.name;

    if (collectionName === USER_ADDED_PLUGINS_DIR_NAME) {
      const singletonsBasePath = path.join(this.collRoot, USER_ADDED_PLUGINS_DIR_NAME);
      try {
        if (fss.existsSync(singletonsBasePath) && fss.lstatSync(singletonsBasePath).isDirectory()) {
          const singletonPluginDirs = await fs.readdir(singletonsBasePath, { withFileTypes: true });
          for (const dirent of singletonPluginDirs) {
            if (dirent.isDirectory()) {
              const singletonPluginId = dirent.name;
              const singletonCollectionNameForUpdate = path.join(USER_ADDED_PLUGINS_DIR_NAME, singletonPluginId);

              try {
                const result = await this.updateCollection(singletonCollectionNameForUpdate);
                updateMessages.push(result.message);
                if (!result.success) {
                  allOverallSuccess = false;
                }
              } catch (singletonError) {
                const errMsg = `Failed to process update for singleton ${singletonCollectionNameForUpdate}: ${singletonError.message}`;
                logger.error(`  ${errMsg}`, { module: 'src/collections/commands/updateAll.js' });
                updateMessages.push(errMsg);
                allOverallSuccess = false;
              }
            }
          }
        }
      } catch (error) {
        const errMsg = `Error processing directory ${USER_ADDED_PLUGINS_DIR_NAME}: ${error.message}`;
        logger.error(`  ${errMsg}`, { module: 'src/collections/commands/updateAll.js' });
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
      }
    } catch (error) {
      const errMsg = `Failed to process update for ${collectionName}: ${error.message}`;
      logger.error(`  ${errMsg}`, { module: 'src/collections/commands/updateAll.js' });
      updateMessages.push(errMsg);
      allOverallSuccess = false;
    }
  }
  logger.info('\nFinished attempting to update all collections.', { module: 'src/collections/commands/updateAll.js' });
  return { success: allOverallSuccess, messages: updateMessages };
};
