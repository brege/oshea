// src/collections/commands/updateAll.js
// No longer requires fs, path, or chalk

module.exports = async function updateAllCollections(dependencies) {
  const { fss, fs, path, chalk, constants } = dependencies;
  const { USER_ADDED_PLUGINS_DIR_NAME } = constants;

  let allOverallSuccess = true;
  const updateMessages = [];

  const downloadedCollectionInfos = await this.listCollections('downloaded');

  if (!downloadedCollectionInfos || downloadedCollectionInfos.length === 0) {
    console.log(chalk.yellow('No collections are currently downloaded. Nothing to update.'));
    return { success: true, messages: ['No collections downloaded.']};
  }

  console.log(chalk.blue('Processing updates for downloaded collections:'));

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
                console.error(chalk.red(`  ${errMsg}`));
                updateMessages.push(errMsg);
                allOverallSuccess = false;
              }
            }
          }
        }
      } catch (error) {
        const errMsg = `Error processing directory ${USER_ADDED_PLUGINS_DIR_NAME}: ${error.message}`;
        console.error(chalk.red(`  ${errMsg}`));
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
      console.error(chalk.red(`  ${errMsg}`));
      updateMessages.push(errMsg);
      allOverallSuccess = false;
    }
  }
  console.log(chalk.blueBright('\nFinished attempting to update all collections.'));
  return { success: allOverallSuccess, messages: updateMessages };
};
