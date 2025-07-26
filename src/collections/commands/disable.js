// src/collections/commands/disable.js
module.exports = async function disablePlugin(dependencies, invokeName) {
  const { logger } = dependencies;

  logger.debug('Attempting to disable plugin', {
    context: 'DisablePluginCommand',
    invokeName: invokeName
  });

  const manifest = await this._readEnabledManifest();
  const pluginIndex = manifest.enabled_plugins.findIndex(p => p.invoke_name === invokeName);

  if (pluginIndex === -1) {
    logger.error('Plugin not found in enabled manifest', {
      context: 'DisablePluginCommand',
      invokeName: invokeName,
      error: `Plugin with invoke_name "${invokeName}" not found in the enabled manifest.`
    });
    throw new Error(`Plugin with invoke_name "${invokeName}" not found in the enabled manifest.`);
  }

  // Remove the plugin from the array
  const disabledPlugin = manifest.enabled_plugins.splice(pluginIndex, 1)[0];
  logger.debug('Plugin entry removed from manifest', {
    context: 'DisablePluginCommand',
    invokeName: invokeName,
    collectionName: disabledPlugin.collection_name,
    pluginId: disabledPlugin.plugin_id
  });

  await this._writeEnabledManifest(manifest);

  logger.success('Plugin disabled successfully', {
    context: 'DisablePluginCommand',
    invokeName: invokeName
  });

  return { success: true, message: `Plugin "${invokeName}" disabled.` };
};
