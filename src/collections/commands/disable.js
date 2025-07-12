// src/collections/commands/disable.js
module.exports = async function disablePlugin(dependencies, invokeName) {
  const { logger } = dependencies;

  const manifest = await this._readEnabledManifest();
  const pluginIndex = manifest.enabled_plugins.findIndex(p => p.invoke_name === invokeName);

  if (pluginIndex === -1) {
    throw new Error(`Plugin with invoke_name "${invokeName}" not found in the enabled manifest.`);
  }

  // Remove the plugin from the array
  manifest.enabled_plugins.splice(pluginIndex, 1);

  await this._writeEnabledManifest(manifest);

  logger.success(`Plugin "${invokeName}" disabled successfully.`, { module: 'src/collections/commands/disable.js' });

  return { success: true, message: `Plugin "${invokeName}" disabled.` };
};
