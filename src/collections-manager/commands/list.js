// dev/src/collections-manager/commands/list.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
// No specific constants needed by this command itself beyond what 'this' provides access to.

module.exports = async function listCollections(type = 'downloaded', collectionNameFilter = null) {
  // 'this' will be the CollectionsManager instance
  if (type === 'downloaded') {
    try {
      if (!fss.existsSync(this.collRoot)) {
        return [];
      }
      const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
      const collectionInfos = [];

      for (const dirent of entries) {
        if (dirent.isDirectory()) {
          const collectionName = dirent.name;
          const metadata = await this._readCollectionMetadata(collectionName); // Private method on 'this'
          collectionInfos.push({
            name: collectionName,
            source: metadata?.source || 'N/A (Metadata missing or unreadable)',
            added_on: metadata?.added_on || 'N/A',
            updated_on: metadata?.updated_on // Will be undefined if never updated
          });
        }
      }

      collectionInfos.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return collectionInfos;
    } catch (error) {
      console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
      throw error; // Re-throw to be caught by CLI or calling function
    }
  } else if (type === 'available') {
      // Calls the bound listAvailablePluginsCmd method
      const availablePlugins = await this.listAvailablePlugins(collectionNameFilter);
      return availablePlugins;
  } else if (type === 'enabled') {
      const enabledManifest = await this._readEnabledManifest(); // Private method on 'this'
      let pluginsToDisplay = enabledManifest.enabled_plugins;

      if (collectionNameFilter) {
          pluginsToDisplay = pluginsToDisplay.filter(p => p.collection_name === collectionNameFilter);
      }

      pluginsToDisplay.sort((a,b) => a.invoke_name.toLowerCase().localeCompare(b.invoke_name.toLowerCase()));
      return pluginsToDisplay;
  } else {
    // This case should ideally be caught by CLI validation if using choices
    console.log(chalk.yellow(`  Listing for type '${type}' is not implemented in manager's listCollections method.`));
    return [];
  }
};
