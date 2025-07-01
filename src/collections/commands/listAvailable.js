// src/collections/commands/listAvailable.js
// No longer requires fs, path, chalk, yaml, or constants

async function _findPluginsInCollectionDir(dependencies, collectionPath, collectionName, debug, _readCollectionMetadataFunc) {
  const { fss, fs, path, chalk, yaml, constants } = dependencies;
  const { METADATA_FILENAME, USER_ADDED_PLUGINS_DIR_NAME } = constants;

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
      let foundConfig = false;

      const standardConfigPath = path.join(pluginItselfPath, `${pluginId}.config.yaml`);
      const alternativeYamlPath = path.join(pluginItselfPath, `${pluginId}.yaml`);

      if (fss.existsSync(standardConfigPath) && fss.lstatSync(standardConfigPath).isFile()) {
          actualConfigPath = standardConfigPath;
          foundConfig = true;
      } else if (fss.existsSync(alternativeYamlPath) && fss.lstatSync(alternativeYamlPath).isFile()) {
          actualConfigPath = alternativeYamlPath;
          foundConfig = true;
      }

      if (foundConfig && actualConfigPath) {
        const pluginInfoBase = {
            collection: collectionName,
            plugin_id: pluginId,
            config_path: path.resolve(actualConfigPath),
            base_path: path.resolve(pluginItselfPath)
        };

        try {
          const configFileContent = await fs.readFile(actualConfigPath, 'utf8');
          const pluginConfigData = yaml.load(configFileContent);
          pluginInfoBase.description = pluginConfigData.description || 'Plugin description not available.';
        } catch (e) {
          if(debug) console.warn(chalk.yellow(`  WARN (CM:_fPICD via listAvailable): Could not read/parse plugin config ${actualConfigPath} for ${pluginId} in ${collectionName}: ${e.message.split('\n')[0]}`));
          pluginInfoBase.description = chalk.red(`Error loading plugin config: ${e.message.substring(0, 50)}...`);
        }

        if (collectionName === USER_ADDED_PLUGINS_DIR_NAME && _readCollectionMetadataFunc) {
            pluginInfoBase.is_singleton = true;
            try {
                const metadata = await _readCollectionMetadataFunc(path.join(USER_ADDED_PLUGINS_DIR_NAME, pluginId));
                if (metadata) {
                    pluginInfoBase.original_source = metadata.source;
                    pluginInfoBase.added_on = metadata.added_on;
                    pluginInfoBase.updated_on = metadata.updated_on;
                } else {
                    if (debug) console.log(chalk.magenta(`DEBUG (CM:_fPICD via listAvailable): No specific metadata found for singleton ${pluginId} at ${path.join(USER_ADDED_PLUGINS_DIR_NAME, pluginId)}`));
                }
            } catch (metaError) {
                if (debug) {
                    console.warn(chalk.yellow(`  WARN (CM:_fPICD via listAvailable): Could not read .collection-metadata.yaml for singleton ${pluginId} in ${collectionName}: ${metaError.message.split('\n')[0]}`));
                }
                pluginInfoBase.metadata_error = `Metadata unreadable: ${metaError.message.substring(0,30)}...`;
            }
        }

        if (pluginInfoBase.is_singleton && pluginInfoBase.original_source) {
            if (!fss.existsSync(pluginInfoBase.original_source)) {
                pluginInfoBase.is_original_source_missing = true;
                if (debug) {
                    console.log(chalk.bgYellow.black(`DEBUG (listAvailable): Set 'is_original_source_missing' for plugin_id: ${pluginId}`));
                }
            }
        }

        availablePlugins.push(pluginInfoBase);

      } else {
           if (debug) {
              console.log(chalk.magenta(`DEBUG (CM:_fPICD via listAvailable): No config file (${pluginId}.config.yaml or ${pluginId}.yaml) found for ${pluginId} in ${collectionName}. Looked in ${pluginItselfPath}`));
           }
      }
    }
  }
  return availablePlugins;
}

module.exports = async function listAvailablePlugins(dependencies, collectionNameFilter = null) {
  const { fss, fs, path, chalk } = dependencies;

  let allAvailablePlugins = [];
  if (!fss.existsSync(this.collRoot)) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:listAvailablePlugins): Collection root ${this.collRoot} does not exist. Returning empty.`));
    return [];
  }

  const readMetadataFunc = this._readCollectionMetadata.bind(this);

  if (collectionNameFilter) {
    const singleCollectionPath = path.join(this.collRoot, collectionNameFilter);
    if (!fss.existsSync(singleCollectionPath) || !fss.lstatSync(singleCollectionPath).isDirectory()) {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:listAvailablePlugins): Filtered collection path ${singleCollectionPath} does not exist or not a directory. Returning empty.`));
      return [];
    }
    allAvailablePlugins = await _findPluginsInCollectionDir(dependencies, singleCollectionPath, collectionNameFilter, this.debug, readMetadataFunc);
  } else {
    const collectionDirs = (await fs.readdir(this.collRoot, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const collectionName of collectionDirs) {
      const collectionPath = path.join(this.collRoot, collectionName);
      const pluginsInCollection = await _findPluginsInCollectionDir(dependencies, collectionPath, collectionName, this.debug, readMetadataFunc);
      allAvailablePlugins.push(...pluginsInCollection);
    }
  }

  allAvailablePlugins.sort((a,b) => {
      const collA = a.collection.toLowerCase();
      const collB = b.collection.toLowerCase();
      if (collA < collB) return -1;
      if (collA > collB) return 1;
      return a.plugin_id.toLowerCase().localeCompare(b.plugin_id.toLowerCase());
  });
  return allAvailablePlugins;
};
