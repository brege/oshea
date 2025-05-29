// dev/src/collections-manager/commands/remove.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml'); // Not strictly needed here, but good for consistency if it were
const { ENABLED_MANIFEST_FILENAME } = require('../constants');

module.exports = async function removeCollection(collectionName, options = {}) {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection): Removing collection: ${collectionName}, options: ${JSON.stringify(options)}`));
  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    throw new Error(`Collection "${collectionName}" not found at ${collectionPath}.`);
  }
  if (!fss.lstatSync(collectionPath).isDirectory()) {
    throw new Error(`Target "${collectionName}" at ${collectionPath} is not a directory.`);
  }

  let enabledManifest = await this._readEnabledManifest(); // Private method on 'this'
  const enabledPluginsFromThisCollection = enabledManifest.enabled_plugins.filter(p => p.collection_name === collectionName);

  if (enabledPluginsFromThisCollection.length > 0 && !options.force) {
    const pluginNames = enabledPluginsFromThisCollection.map(p => `"${p.invoke_name}" (from ${p.plugin_id})`).join(', ');
    throw new Error(`Collection "${collectionName}" has enabled plugins: ${pluginNames}. Please disable them first or use the --force option.`);
  }

  if (options.force && enabledPluginsFromThisCollection.length > 0) {
    console.log(chalk.yellow(`  Force removing. Disabling plugins from "${collectionName}":`));
    let manifestChanged = false;
    for (const plugin of enabledPluginsFromThisCollection) {
      console.log(chalk.yellow(`    - Disabling "${plugin.invoke_name}"...`));
      const initialLength = enabledManifest.enabled_plugins.length;
      enabledManifest.enabled_plugins = enabledManifest.enabled_plugins.filter(p => p.invoke_name !== plugin.invoke_name);
      if (enabledManifest.enabled_plugins.length < initialLength) manifestChanged = true;
    }
    if (manifestChanged) {
      await this._writeEnabledManifest(enabledManifest); // Private method on 'this'
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection --force): Wrote updated manifest after disabling plugins.`));
    }
  }

  try {
    await fsExtra.rm(collectionPath, { recursive: true, force: true });
    console.log(chalk.green(`Collection "${collectionName}" removed successfully from ${this.collRoot}.`));
    return { success: true, message: `Collection "${collectionName}" removed.` };
  } catch (error) {
    console.error(chalk.red(`ERROR (CM:removeCollection): Failed to remove collection directory ${collectionPath}: ${error.message}`));
    throw error;
  }
};
