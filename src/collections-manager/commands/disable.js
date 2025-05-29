// dev/src/collections-manager/commands/disable.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { ENABLED_MANIFEST_FILENAME } = require('../constants');

module.exports = async function disablePlugin(invokeName) {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:disablePlugin): Disabling invoke_name: ${invokeName}`));
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
