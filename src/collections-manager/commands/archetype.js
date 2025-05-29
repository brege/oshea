// dev/src/collections-manager/commands/archetype.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const os = require('os');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const { DEFAULT_ARCHETYPE_BASE_DIR_NAME } = require('../constants');

module.exports = async function archetypePlugin(sourcePluginIdentifier, newArchetypeName, options = {}) {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Creating archetype from ${sourcePluginIdentifier} as ${newArchetypeName} with options ${JSON.stringify(options)}`));

  const parts = sourcePluginIdentifier.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid format for sourcePluginIdentifier: "${sourcePluginIdentifier}". Expected "collection_name/plugin_id".`);
  }
  const sourceCollectionName = parts[0];
  const sourcePluginId = parts[1];

  const availableSourcePlugins = await this.listAvailablePlugins(sourceCollectionName); // Bound method
  const sourcePluginInfo = availableSourcePlugins.find(p => p.plugin_id === sourcePluginId && p.collection === sourceCollectionName);

  if (!sourcePluginInfo || !sourcePluginInfo.base_path) {
    // If base_path isn't populated by listAvailablePlugins, this check needs adjustment or ensure base_path is always there.
    // Based on previous listAvailable.js, base_path should be there.
    throw new Error(`Source plugin "${sourcePluginId}" in collection "${sourceCollectionName}" not found or its base_path is missing.`);
  }
  const sourcePluginBasePath = sourcePluginInfo.base_path;


  let targetBaseDir;
  if (options.targetDir) {
      targetBaseDir = path.resolve(options.targetDir);
  } else {
      // Default: ~/.local/share/md-to-pdf/custom_plugins_user/
      // this.collRoot is typically ~/.local/share/md-to-pdf/collections/
      targetBaseDir = path.join(path.dirname(this.collRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
  }

  const archetypePath = path.join(targetBaseDir, newArchetypeName);

  if (fss.existsSync(archetypePath)) {
      throw new Error(`Target archetype directory "${archetypePath}" already exists. Please remove it or choose a different name.`);
  }

  try {
      await fs.mkdir(targetBaseDir, { recursive: true }); // Ensure targetBaseDir exists
      await fsExtra.copy(sourcePluginBasePath, archetypePath);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Copied from ${sourcePluginBasePath} to ${archetypePath}`));

      // --- File renaming and modification logic will be completed in v0.7.9 ---
      // For v0.7.8 (refactor), we stop here for this command module.
      // The CLI output in collections-manager-cli.js for 'archetype' will need to be adjusted
      // temporarily if it expects more return details, or we return a simpler success for now.

      console.log(chalk.yellow(`  INFO (CM:archetypePlugin): Initial copy for archetype '${newArchetypeName}' complete. Detailed file modifications deferred to v0.7.9.`));
      return { success: true, message: `Archetype '${newArchetypeName}' directory created and files copied. Further processing pending v0.7.9.`, archetypePath: archetypePath };

  } catch (error) {
      console.error(chalk.red(`ERROR (CM:archetypePlugin): Failed to create archetype directory or copy files: ${error.message}`));
      throw error;
  }
};
