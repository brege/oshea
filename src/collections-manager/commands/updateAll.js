// src/collections-manager/commands/updateAll.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
const { USER_ADDED_PLUGINS_DIR_NAME } = require('../constants'); // Import constant

module.exports = async function updateAllCollections() {
  if (this.debug) console.log(chalk.magenta("DEBUG (CM:updateAllCollections): Attempting to update all downloaded collections."));
  let allOverallSuccess = true;
  const updateMessages = [];

  const downloadedCollectionInfos = await this.listCollections('downloaded');

  if (!downloadedCollectionInfos || downloadedCollectionInfos.length === 0) {
      console.log(chalk.yellow("No collections are currently downloaded. Nothing to update."));
      return { success: true, messages: ["No collections downloaded."]};
  }

  console.log(chalk.blue("Processing updates for downloaded collections:"));

  for (const collectionInfo of downloadedCollectionInfos) {
      const collectionName = collectionInfo.name;

      if (collectionName === USER_ADDED_PLUGINS_DIR_NAME) {
        const skipMessage = `INFO: Skipping update for "${USER_ADDED_PLUGINS_DIR_NAME}" container. To update individual user-added plugins, use "md-to-pdf collection update ${USER_ADDED_PLUGINS_DIR_NAME}/<plugin_id>"`;
        console.log(chalk.blue(`  ${skipMessage}`));
        updateMessages.push(skipMessage);
        continue; // Skip to the next collection
      }

      // updateCollection will determine if it's Git, local-syncable, or neither.
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
  console.log(chalk.blueBright("\nFinished attempting to update all collections."));
  return { success: allOverallSuccess, messages: updateMessages };
};
