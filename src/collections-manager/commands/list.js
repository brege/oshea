// src/collections-manager/commands/list.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
const { USER_ADDED_PLUGINS_DIR_NAME, METADATA_FILENAME } = require('../constants'); // Added METADATA_FILENAME

module.exports = async function listCollections(type = 'downloaded', collectionNameFilter = null) {
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
          if (collectionName === USER_ADDED_PLUGINS_DIR_NAME) {
            const singletonPluginsContainerPath = path.join(this.collRoot, USER_ADDED_PLUGINS_DIR_NAME);
            if (fss.existsSync(singletonPluginsContainerPath)) {
                const singletons = await fs.readdir(singletonPluginsContainerPath, { withFileTypes: true });
                if (singletons.some(sDirent => sDirent.isDirectory())) {
                    collectionInfos.push({
                        name: USER_ADDED_PLUGINS_DIR_NAME,
                        source: singletonPluginsContainerPath, // Actual path
                        special_type: 'singleton_container', // Marker for CLI
                        added_on: 'N/A (Container)',
                        updated_on: undefined
                    });
                }
            }
          } else {
            // For regular collections, read their metadata
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
      console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
      throw error;
    }
  } else if (type === 'available') {
      const availablePlugins = await this.listAvailablePlugins(collectionNameFilter);
      return availablePlugins;
  } else if (type === 'enabled') {
      const enabledManifest = await this._readEnabledManifest();
      let pluginsToDisplay = enabledManifest.enabled_plugins;
      if (collectionNameFilter) {
          pluginsToDisplay = pluginsToDisplay.filter(p => p.collection_name === collectionNameFilter);
      }
      pluginsToDisplay.sort((a,b) => a.invoke_name.toLowerCase().localeCompare(b.invoke_name.toLowerCase()));
      return pluginsToDisplay;
  } else {
    console.log(chalk.yellow(`  Listing for type '${type}' is not implemented in manager's listCollections method.`));
    return [];
  }
};
