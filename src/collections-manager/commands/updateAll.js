// src/collections-manager/commands/updateAll.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');

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
      // updateCollection will determine if it's Git, local-syncable, or neither.
      try {
          const result = await this.updateCollection(collectionName); // Call the enhanced updateCollection
          updateMessages.push(result.message);
          if (!result.success) {
            // A "success:false" from updateCollection can mean "aborted due to local changes"
            // or "source not found", which are not hard failures for the batch operation itself.
            // However, if updateCollection itself throws an error, it's a hard failure.
            // We'll consider any `success:false` from `updateCollection` as something that
            // makes `allOverallSuccess` false for the batch.
            allOverallSuccess = false;
          }
      } catch (error) { // Catch if updateCollection itself throws an unexpected error
          const errMsg = `Failed to process update for ${collectionName}: ${error.message}`;
          console.error(chalk.red(`  ${errMsg}`));
          updateMessages.push(errMsg);
          allOverallSuccess = false;
      }
  }
  console.log(chalk.blueBright("\nFinished attempting to update all collections."));
  return { success: allOverallSuccess, messages: updateMessages };
};
