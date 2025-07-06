// src/collections/commands/listAvailable.js

async function _findPluginsInCollectionDir(dependencies, collectionPath, collectionName, _readCollectionMetadataFunc) {
  const { fss, fs, path, yaml, constants } = dependencies;
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
          pluginInfoBase.description = `Error loading plugin config: ${e.message.substring(0, 50)}...`;
        }

        if (collectionName === USER_ADDED_PLUGINS_DIR_NAME && _readCollectionMetadataFunc) {
          pluginInfoBase.is_singleton = true;
          try {
            const metadata = await _readCollectionMetadataFunc(path.join(USER_ADDED_PLUGINS_DIR_NAME, pluginId));
            if (metadata) {
              pluginInfoBase.original_source = metadata.source;
              pluginInfoBase.added_on = metadata.added_on;
              pluginInfoBase.updated_on = metadata.updated_on;
            }
          } catch (metaError) {
            pluginInfoBase.metadata_error = `Metadata unreadable: ${metaError.message.substring(0,30)}...`;
          }
        }
        if (pluginInfoBase.is_singleton && pluginInfoBase.original_source) {
          if (!fss.existsSync(pluginInfoBase.original_source)) {
            pluginInfoBase.is_original_source_missing = true;
          }
        }
        availablePlugins.push(pluginInfoBase);
      }
    }
  }
  return availablePlugins;
}

module.exports = async function listAvailablePlugins(dependencies, collectionNameFilter = null) {
  const { fss, fs, path } = dependencies;

  let allAvailablePlugins = [];
  if (!fss.existsSync(this.collRoot)) {
    return [];
  }

  const readMetadataFunc = this._readCollectionMetadata.bind(this);

  if (collectionNameFilter) {
    const singleCollectionPath = path.join(this.collRoot, collectionNameFilter);
    if (!fss.existsSync(singleCollectionPath) || !fss.lstatSync(singleCollectionPath).isDirectory()) {
      return [];
    }
    allAvailablePlugins = await _findPluginsInCollectionDir(dependencies, singleCollectionPath, collectionNameFilter, readMetadataFunc);
  } else {
    const collectionDirs = (await fs.readdir(this.collRoot, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const collectionName of collectionDirs) {
      const collectionPath = path.join(this.collRoot, collectionName);
      const pluginsInCollection = await _findPluginsInCollectionDir(dependencies, collectionPath, collectionName, readMetadataFunc);
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
