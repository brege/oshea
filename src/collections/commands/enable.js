// src/collections/commands/enable.js
const { validatorPath } = require('@paths');
const { validate: pluginValidator } = require(validatorPath);

module.exports = async function enablePlugin(dependencies, collectionPluginId, options = {}) {
  const { fss, logger } = dependencies;

  logger.debug('Attempting to enable plugin', {
    context: 'EnablePluginCommand',
    collectionPluginId: collectionPluginId,
    options: options
  });

  const parts = collectionPluginId.split('/');
  if (parts.length !== 2) {
    logger.error('Invalid format for collectionPluginId', {
      context: 'EnablePluginCommand',
      collectionPluginId: collectionPluginId,
      error: `Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`
    });
    throw new Error(`Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`);
  }
  const collectionName = parts[0];
  const pluginId = parts[1];
  logger.debug('Parsed collection and plugin ID', {
    context: 'EnablePluginCommand',
    collectionName: collectionName,
    pluginId: pluginId
  });

  const availablePlugins = await this.listAvailablePlugins(collectionName);

  const pluginToEnable = availablePlugins.find(p => p.plugin_id === pluginId && p.collection === collectionName);

  if (!pluginToEnable) {
    logger.error('Plugin not available or does not exist', {
      context: 'EnablePluginCommand',
      pluginId: pluginId,
      collectionName: collectionName,
      error: `Plugin "${pluginId}" in collection "${collectionName}" is not available or does not exist.`
    });
    throw new Error(`Plugin "${pluginId}" in collection "${collectionName}" is not available or does not exist.`);
  }
  if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) {
    logger.error('Config path for plugin is invalid or not found', {
      context: 'EnablePluginCommand',
      pluginId: pluginId,
      collectionName: collectionName,
      configPath: pluginToEnable.config_path,
      error: `Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`
    });
    throw new Error(`Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`);
  }
  const absolutePluginConfigPath = pluginToEnable.config_path;
  logger.debug('Plugin to enable found and config path verified', {
    context: 'EnablePluginCommand',
    pluginId: pluginId,
    configPath: absolutePluginConfigPath
  });


  if (!options.bypassValidation) {
    logger.debug('Running validation for plugin before enabling', {
      context: 'EnablePluginCommand',
      pluginId: pluginId
    });
    const pluginDirectoryPath = pluginToEnable.base_path;
    const validationResult = pluginValidator(pluginDirectoryPath);

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.join('\n  - ');
      logger.error('Plugin validation failed', {
        context: 'EnablePluginCommand',
        pluginId: pluginId,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        validationMessage: `Plugin validation failed for '${pluginId}'. Errors:\n  - ${errorMessages}`
      });
      throw new Error(`Plugin validation failed for '${pluginId}'. Errors:\n  - ${errorMessages}`);
    }
    logger.success('Plugin passed validation', {
      context: 'EnablePluginCommand',
      pluginId: pluginId
    });
  } else {
    logger.warn('Validation bypassed for plugin', {
      context: 'EnablePluginCommand',
      pluginId: pluginId,
      flag: '--bypass-validation'
    });
  }


  let invokeName = options.name || pluginId;
  if (!/^[a-zA-Z0-9_.-]+$/.test(invokeName)) {
    logger.error('Invalid invoke_name format', {
      context: 'EnablePluginCommand',
      invokeName: invokeName,
      error: `Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`
    });
    throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`);
  }

  const enabledManifest = await this._readEnabledManifest();

  if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
    logger.error('Invoke name already in use', {
      context: 'EnablePluginCommand',
      invokeName: invokeName,
      error: `Invoke name "${invokeName}" is already in use. Choose a different name using --name.`
    });
    throw new Error(`Invoke name "${invokeName}" is already in use. Choose a different name using --name.`);
  }
  logger.debug('Invoke name is unique', {
    context: 'EnablePluginCommand',
    invokeName: invokeName
  });


  const newEntry = {
    collection_name: collectionName,
    plugin_id: pluginId,
    invoke_name: invokeName,
    config_path: absolutePluginConfigPath,
    added_on: new Date().toISOString(),
  };

  enabledManifest.enabled_plugins.push(newEntry);
  enabledManifest.enabled_plugins.sort((a, b) => a.invoke_name.localeCompare(b.invoke_name));
  logger.debug('New plugin entry added to manifest', {
    context: 'EnablePluginCommand',
    newEntry: newEntry
  });

  await this._writeEnabledManifest(enabledManifest);
  logger.success('Plugin enabled successfully', {
    context: 'EnablePluginCommand',
    collectionPluginId: collectionPluginId,
    invokeName: invokeName
  });
  return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
};
