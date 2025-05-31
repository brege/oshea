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

  const downloadedCollections = await this.listCollections('downloaded'); // Uses bound method
  if (!downloadedCollections || downloadedCollections.length === 0) {
      console.log(chalk.yellow("No collections are currently downloaded. Nothing to update."));
      return { success: true, messages: ["No collections downloaded."]};
  }

  console.log(chalk.blue("Processing updates for downloaded collections:"));

  for (const collectionName of downloadedCollections) {
      const metadata = await this._readCollectionMetadata(collectionName); // Private method

      if (!metadata) {
          const skipMsg = `Skipping ${collectionName}: Metadata file not found or unreadable.`;
          console.log(chalk.yellow(`  ${skipMsg}`));
          updateMessages.push(skipMsg);
          // Consider if this should set allOverallSuccess to false.
          // For now, let's assume only active update attempts affect overall success.
          continue;
      }

      if (metadata.source && (/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')) )) {
          try {
              const result = await this.updateCollection(collectionName); // Uses bound method
              updateMessages.push(result.message);
              // If any individual update result is not successful, the overall operation is not fully successful.
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
          const skipMsg = `Skipping ${collectionName}: Not a Git-based collection (source: ${metadata.source || 'N/A'}).`;
          console.log(chalk.yellow(`  ${skipMsg}`));
          updateMessages.push(skipMsg);
      }
  }
  console.log(chalk.blueBright("\nFinished attempting to update all collections."));
  return { success: allOverallSuccess, messages: updateMessages };
};
