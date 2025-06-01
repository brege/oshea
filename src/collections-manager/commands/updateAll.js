// dev/src/collections-manager/commands/updateAll.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
// No specific constants needed directly by this command itself,
// but _readCollectionMetadata and updateCollection (called via 'this') will use them.

module.exports = async function updateAllCollections() {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta("DEBUG (CM:updateAllCollections): Attempting to update all Git-based collections."));
  let allOverallSuccess = true;
  const updateMessages = [];

  // listCollections('downloaded') now returns an array of objects: { name, source, added_on, updated_on }
  const downloadedCollectionInfos = await this.listCollections('downloaded'); // Uses bound method

  if (!downloadedCollectionInfos || downloadedCollectionInfos.length === 0) {
      console.log(chalk.yellow("No collections are currently downloaded. Nothing to update."));
      return { success: true, messages: ["No collections downloaded."]};
  }

  console.log(chalk.blue("Processing updates for downloaded collections:"));

  for (const collectionInfo of downloadedCollectionInfos) { // Changed loop variable name
      const collectionName = collectionInfo.name; // Extract the name string
      const collectionSource = collectionInfo.source; // Extract the source

      // We can use collectionInfo.source directly instead of re-reading metadata just for the source,
      // but updateCollection will read metadata again. This is fine.
      // For clarity here, we use the source from collectionInfo for the check.

      if (collectionSource && (/^(http(s)?:\/\/|git@)/.test(collectionSource) || (typeof collectionSource === 'string' && collectionSource.endsWith('.git')) )) {
          try {
              // Pass the string name to updateCollection
              const result = await this.updateCollection(collectionName); // Uses bound method
              updateMessages.push(result.message);
              if (!result.success) {
                allOverallSuccess = false;
              }
          } catch (error) {
              const errMsg = `Failed to update ${collectionName}: ${error.message}`;
              console.error(chalk.red(`  ${errMsg}`));
              updateMessages.push(errMsg);
              allOverallSuccess = false;
          }
      } else {
          const skipMsg = `Skipping ${collectionName}: Not a Git-based collection (source: ${collectionSource || 'N/A'}).`;
          console.log(chalk.yellow(`  ${skipMsg}`));
          updateMessages.push(skipMsg);
      }
  }
  console.log(chalk.blueBright("\nFinished attempting to update all collections."));
  return { success: allOverallSuccess, messages: updateMessages };
};
