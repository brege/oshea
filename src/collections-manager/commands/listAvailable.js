// dev/src/collections-manager/commands/listAvailable.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { METADATA_FILENAME } = require('../constants');

async function _findPluginsInCollectionDir(collectionPath, collectionName, debug) {
  // This helper is now local to listAvailable.js
  // It takes 'debug' as an argument since it no longer has 'this.debug'
  const availablePlugins = [];
  if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
    return [];
  }

  const pluginDirs = await fs.readdir(collectionPath, { withFileTypes: true });
  for (const pluginDir of pluginDirs) {
    if (pluginDir.isDirectory()) {
      const pluginId = pluginDir.name;
      if (pluginId === '.git' || pluginId === METADATA_FILENAME) continue;

      const pluginItselfPath = path.join(collectionPath, pluginId);
      let actualConfigPath = '';
      let description = 'No description found.';
      let foundConfig = false;

      const standardConfigPath = path.join(pluginItselfPath, `${pluginId}.config.yaml`);
      const alternativeYamlPath = path.join(pluginItselfPath, `${pluginId}.yaml`);

      if (fss.existsSync(standardConfigPath) && fss.lstatSync(standardConfigPath).isFile()) {
          actualConfigPath = standardConfigPath;
          foundConfig = true;
          if (debug) console.log(chalk.magenta(`DEBUG (CM:_fPICD via listAvailable): Found standard config ${path.basename(actualConfigPath)} for ${pluginId} in ${collectionName}`));
      } else if (fss.existsSync(alternativeYamlPath) && fss.lstatSync(alternativeYamlPath).isFile()) {
          actualConfigPath = alternativeYamlPath;
          foundConfig = true;
          if (debug) console.log(chalk.magenta(`DEBUG (CM:_fPICD via listAvailable): Found alternative config ${path.basename(actualConfigPath)} for ${pluginId} in ${collectionName}`));
      }

      if (foundConfig && actualConfigPath) {
        try {
          const configFileContent = await fs.readFile(actualConfigPath, 'utf8');
          const pluginConfigData = yaml.load(configFileContent);
          description = pluginConfigData.description || 'Plugin description not available.';
          availablePlugins.push({
            collection: collectionName,
            plugin_id: pluginId,
            description: description,
            config_path: path.resolve(actualConfigPath),
            base_path: path.resolve(pluginItselfPath)
          });
        } catch (e) {
          console.warn(chalk.yellow(`  WARN (CM:_fPICD via listAvailable): Could not read/parse ${actualConfigPath} for ${pluginId} in ${collectionName}: ${e.message}`));
          availablePlugins.push({
            collection: collectionName,
            plugin_id: pluginId,
            description: chalk.red(`Error loading config: ${e.message.substring(0, 50)}...`),
            config_path: path.resolve(actualConfigPath),
            base_path: path.resolve(pluginItselfPath)
          });
        }
      } else {
           if (debug) {
              console.log(chalk.magenta(`DEBUG (CM:_fPICD via listAvailable): No config file (${pluginId}.config.yaml or ${pluginId}.yaml) found for ${pluginId} in ${collectionName}. Looked in ${pluginItselfPath}`));
           }
      }
    }
  }
  return availablePlugins;
}

module.exports = async function listAvailablePlugins(collectionNameFilter = null) {
  // 'this' will be the CollectionsManager instance
  let allAvailablePlugins = [];
  if (!fss.existsSync(this.collRoot)) {
    return [];
  }

  if (collectionNameFilter) {
    const singleCollectionPath = path.join(this.collRoot, collectionNameFilter);
    if (!fss.existsSync(singleCollectionPath) || !fss.lstatSync(singleCollectionPath).isDirectory()) {
      return [];
    }
    allAvailablePlugins = await _findPluginsInCollectionDir(singleCollectionPath, collectionNameFilter, this.debug);
  } else {
    const collectionNames = (await fs.readdir(this.collRoot, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const collectionName of collectionNames) {
      const collectionPath = path.join(this.collRoot, collectionName);
      const pluginsInCollection = await _findPluginsInCollectionDir(collectionPath, collectionName, this.debug);
      allAvailablePlugins.push(...pluginsInCollection);
    }
  }
  allAvailablePlugins.sort((a,b) => {
      if (a.collection.toLowerCase() < b.collection.toLowerCase()) return -1;
      if (a.collection.toLowerCase() > b.collection.toLowerCase()) return 1;
      return a.plugin_id.toLowerCase().localeCompare(b.plugin_id.toLowerCase());
  });
  return allAvailablePlugins;
};
