// src/collections-manager/commands/enable.js
// No longer requires fs, path, yaml, chalk, or constants

module.exports = async function enablePlugin(dependencies, collectionPluginId, options = {}) {
  // Destructure dependencies
  const { fss, chalk } = dependencies;

  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enablePlugin): Enabling ID: ${collectionPluginId}, options: ${JSON.stringify(options)}`));

  const parts = collectionPluginId.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`);
  }
  const collectionName = parts[0];
  const pluginId = parts[1];

  // listAvailablePlugins will be called on 'this' which is the bound CollectionsManager instance
  const availablePlugins = await this.listAvailablePlugins(collectionName);
  if (this.debug) console.log(chalk.blueBright(`[DEBUG_CM_ENABLE] Available plugins in ${collectionName}: ${JSON.stringify(availablePlugins, null, 2)}`));

  const pluginToEnable = availablePlugins.find(p => p.plugin_id === pluginId && p.collection === collectionName);

  if (!pluginToEnable) {
    throw new Error(`Plugin "${pluginId}" in collection "${collectionName}" is not available or does not exist.`);
  }
  if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) {
      throw new Error(`Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`);
  }
  const absolutePluginConfigPath = pluginToEnable.config_path;

  let invokeName = options.name || pluginId;
  if (!/^[a-zA-Z0-9_.-]+$/.test(invokeName)) {
      throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`);
  }

  const enabledManifest = await this._readEnabledManifest(); // Uses private method from 'this'

  if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
    throw new Error(`Invoke name "${invokeName}" is already in use. Choose a different name using --name.`);
  }

  const newEntry = {
    collection_name: collectionName,
    plugin_id: pluginId,
    invoke_name: invokeName,
    config_path: absolutePluginConfigPath,
    added_on: new Date().toISOString(),
  };

  enabledManifest.enabled_plugins.push(newEntry);
  enabledManifest.enabled_plugins.sort((a, b) => a.invoke_name.localeCompare(b.invoke_name));

  await this._writeEnabledManifest(enabledManifest); // Uses private method from 'this'
  console.log(chalk.green(`Plugin "${collectionName}/${pluginId}" enabled successfully as "${invokeName}".`));
  return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
};
