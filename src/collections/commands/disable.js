// src/collections/commands/disable.js
// No longer requires fs, path, yaml, chalk, or constants

module.exports = async function disablePlugin(dependencies, invokeName) {
  const { chalk } = dependencies;

  // 'this' will be the CollectionsManager instance
  const enabledManifest = await this._readEnabledManifest(); // Uses private method

  if (enabledManifest.enabled_plugins.length === 0) {
    console.log(chalk.yellow(`No plugins are currently enabled. Cannot disable "${invokeName}".`));
    return { success: false, message: `No plugins enabled. Cannot disable "${invokeName}".` };
  }

  const initialLength = enabledManifest.enabled_plugins.length;
  enabledManifest.enabled_plugins = enabledManifest.enabled_plugins.filter(p => p.invoke_name !== invokeName);

  if (enabledManifest.enabled_plugins.length === initialLength) {
    console.log(chalk.yellow(`Plugin with invoke name "${invokeName}" not found among enabled plugins.`));
    return { success: false, message: `Plugin invoke name "${invokeName}" not found.` };
  }

  await this._writeEnabledManifest(enabledManifest); // Uses private method
  console.log(chalk.green(`Plugin "${invokeName}" disabled successfully.`));
  return { success: true, message: `Plugin "${invokeName}" disabled.` };
};
