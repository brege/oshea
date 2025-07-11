// src/collections/commands/enable.js
const { validatorPath } = require('@paths');
const { validate: pluginValidator } = require(validatorPath);

module.exports = async function enablePlugin(dependencies, collectionPluginId, options = {}) {

  const { fss, logger } = dependencies;

  const parts = collectionPluginId.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`);
  }
  const collectionName = parts[0];
  const pluginId = parts[1];

  const availablePlugins = await this.listAvailablePlugins(collectionName);

  const pluginToEnable = availablePlugins.find(p => p.plugin_id === pluginId && p.collection === collectionName);

  if (!pluginToEnable) {
    throw new Error(`Plugin "${pluginId}" in collection "${collectionName}" is not available or does not exist.`);
  }
  if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) {
    throw new Error(`Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`);
  }
  const absolutePluginConfigPath = pluginToEnable.config_path;

  if (!options.bypassValidation) {
    logger.info(`  Running validation for plugin '${pluginId}' before enabling...`, { module: 'src/collections/commands/enable.js' });
    const pluginDirectoryPath = pluginToEnable.base_path;
    const validationResult = pluginValidator(pluginDirectoryPath);

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.join('\n  - ');
      throw new Error(`Plugin validation failed for '${pluginId}'. Errors:\n  - ${errorMessages}`);
    }
    logger.success(`  Plugin '${pluginId}' passed validation.`, { module: 'src/collections/commands/enable.js' });
  } else {
    logger.warn(`  Validation bypassed for plugin '${pluginId}' (--bypass-validation flag detected).`, { module: 'src/collections/commands/enable.js' });
  }


  let invokeName = options.name || pluginId;
  if (!/^[a-zA-Z0-9_.-]+$/.test(invokeName)) {
    throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`);
  }

  const enabledManifest = await this._readEnabledManifest();

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

  await this._writeEnabledManifest(enabledManifest);
  logger.success(`Plugin "${collectionName}/${pluginId}" enabled successfully as "${invokeName}".`, { module: 'src/collections/commands/enable.js' });
  return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
};
