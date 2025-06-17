// src/collections-manager/commands/enable.js
const { validate: pluginValidator } = require('../../plugin-validator');

module.exports = async function enablePlugin(dependencies, collectionPluginId, options = {}) {
  // Removed: DEBUG console.log statements
  // console.log('DEBUG (enable.js): Start of enablePlugin function for ID:', collectionPluginId, 'Options:', options);

  // Destructure dependencies
  const { fss, chalk } = dependencies;

  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enablePlugin): Enabling ID: ${collectionPluginId}, options: ${JSON.stringify(options)}`));

  const parts = collectionPluginId.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`);
  }
  const collectionName = parts[0];
  const pluginId = parts[1];

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

  // Removed: DEBUG console.log statements
  // console.log('DEBUG (enable.js): Before validation check, bypassValidation is:', options.bypassValidation);
  if (!options.bypassValidation) {
    console.log(chalk.blue(`  Running validation for plugin '${pluginId}' before enabling...`));
    const pluginDirectoryPath = pluginToEnable.base_path;
    const validationResult = pluginValidator(pluginDirectoryPath);

    if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.join('\n  - ');
        throw new Error(`Plugin validation failed for '${pluginId}'. Errors:\n  - ${errorMessages}`);
    }
    console.log(chalk.green(`  Plugin '${pluginId}' passed validation.`));
  } else {
    // Removed: DEBUG console.log statements
    // console.log('DEBUG (enable.js): Inside bypass validation block.');
    console.log(chalk.yellow(`  Validation bypassed for plugin '${pluginId}' (--bypass-validation flag detected).`));
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
  console.log(chalk.green(`Plugin "${collectionName}/${pluginId}" enabled successfully as "${invokeName}".`));
  return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
};
