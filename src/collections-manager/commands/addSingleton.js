// src/collections-manager/commands/addSingleton.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { METADATA_FILENAME, USER_ADDED_PLUGINS_DIR_NAME } = require('../constants');
const { isValidPluginName } = require('../cm-utils');

/**
 * Adds a single plugin directory to CollectionsManager management.
 * @param {string} sourcePluginPath - Absolute path to the user's plugin directory.
 * @param {Object} options - Options, may contain 'name' for the desired invoke_name.
 * @returns {Promise<Object>} - { success: boolean, message: string, invoke_name?: string, collectionPluginId?: string }
 */
module.exports = async function addSingletonPlugin(sourcePluginPath, options = {}) {
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:addSingletonPlugin): Adding singleton plugin from source: ${sourcePluginPath}, options: ${JSON.stringify(options)}`));

  // 1. Validate sourcePluginPath
  if (!fss.existsSync(sourcePluginPath)) {
    throw new Error(`Source plugin path does not exist: "${sourcePluginPath}"`);
  }
  if (!fss.lstatSync(sourcePluginPath).isDirectory()) {
    throw new Error(`Source plugin path is not a directory: "${sourcePluginPath}"`);
  }

  const pluginId = path.basename(sourcePluginPath);
  if (!isValidPluginName(pluginId)) {
    throw new Error(`Source plugin directory name "${pluginId}" is not a valid plugin name (alphanumeric and hyphens, not at start/end).`);
  }

  const potentialConfigs = [`${pluginId}.config.yaml`, `${pluginId}.yaml`];
  const foundConfig = potentialConfigs.find(cfg => fss.existsSync(path.join(sourcePluginPath, cfg)));

  if (!foundConfig) {
    const altConfigs = fss.readdirSync(sourcePluginPath).filter(f => f.endsWith('.config.yaml') || f.endsWith('.yaml'));
    if (altConfigs.length === 0) {
      throw new Error(`Source directory "${sourcePluginPath}" does not appear to be a valid plugin: missing a recognized '*.config.yaml' or '*.yaml' file.`);
    }
    if(this.debug) console.log(chalk.magenta(`DEBUG (CM:addSingletonPlugin): Found config file(s) like ${altConfigs.join(', ')} in source.`));
  }

  // 2. Determine invoke_name
  let invokeName = options.name || pluginId;
  if (!isValidPluginName(invokeName)) {
    throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric and hyphens (not at start/end).`);
  }

  const enabledManifest = await this._readEnabledManifest();
  if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
    throw new Error(`Invoke name "${invokeName}" is already in use. Please choose a different name using --name.`);
  }

  // 3. Target Directory for singletons
  const singletonsBaseDir = path.join(this.collRoot, USER_ADDED_PLUGINS_DIR_NAME);
  // The plugin itself will be a subdirectory within USER_ADDED_PLUGINS_DIR_NAME
  const targetPluginDir = path.join(singletonsBaseDir, pluginId); 

  if (fss.existsSync(targetPluginDir)) {
    throw new Error(`A plugin with ID "${pluginId}" already exists in the user-added plugins directory: "${targetPluginDir}". Remove it first or choose a different source plugin directory name.`);
  }
  // Ensure the base directory for user-added plugins exists, then the specific plugin's dir
  await fs.mkdir(singletonsBaseDir, { recursive: true }); 
  await fs.mkdir(targetPluginDir, { recursive: true });
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:addSingletonPlugin): Created target directory for singleton: ${targetPluginDir}`));

  // 4. Copy plugin contents
  try {
    // Copy contents of sourcePluginPath *into* targetPluginDir
    await fsExtra.copy(sourcePluginPath, targetPluginDir); 
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:addSingletonPlugin): Copied plugin from ${sourcePluginPath} to ${targetPluginDir}`));
  } catch (copyError) {
    await fsExtra.rm(targetPluginDir, { recursive: true, force: true }).catch(() => {}); // Attempt cleanup
    throw new Error(`Failed to copy plugin from "${sourcePluginPath}" to "${targetPluginDir}": ${copyError.message}`);
  }

  // 5. Create .collection-metadata.yaml for this "singleton's containing collection"
  // The "collection" in this context is USER_ADDED_PLUGINS_DIR_NAME, and the pluginId is the entry.
  // However, for consistency with how other collections are structured and how `update` might work
  // if we ever want to update singletons from their original source,
  // let's create metadata *for the specific plugin's directory* within _user_added_plugins.
  // This means USER_ADDED_PLUGINS_DIR_NAME/pluginId is treated as a "collection of one".
  
  // The metadata is for the directory that represents the "collection" for this singleton.
  // The name of this "collection" is `pluginId` and it resides inside `USER_ADDED_PLUGINS_DIR_NAME`.
  const metadataHoldingCollectionName = path.join(USER_ADDED_PLUGINS_DIR_NAME, pluginId);
  const metadataContent = {
    name: pluginId, // The name of this specific "collection" (which is just the pluginId)
    source: path.resolve(sourcePluginPath), 
    type: 'singleton', // Mark it as a singleton
    added_on: new Date().toISOString(),
  };
  await this._writeCollectionMetadata(metadataHoldingCollectionName, metadataContent);


  // 6. Automatically enable the plugin
  // The collection_name for enablePlugin is USER_ADDED_PLUGINS_DIR_NAME
  // The plugin_id for enablePlugin is the actual pluginId (directory name within USER_ADDED_PLUGINS_DIR_NAME)
  const collectionPluginIdForEnable = `${USER_ADDED_PLUGINS_DIR_NAME}/${pluginId}`;
  
  try {
    await this.enablePlugin(collectionPluginIdForEnable, { name: invokeName });
    console.log(chalk.green(`Singleton plugin "${pluginId}" from "${sourcePluginPath}" added and enabled as "${invokeName}".`));
    return {
      success: true,
      message: `Singleton plugin "${pluginId}" added and enabled as "${invokeName}".`,
      invoke_name: invokeName,
      collectionPluginId: collectionPluginIdForEnable, // This is what was passed to enablePlugin
      path: targetPluginDir // Path where the plugin content now resides in COLL_ROOT
    };
  } catch (enableError) {
    console.error(chalk.red(`ERROR: Plugin "${pluginId}" was copied to "${targetPluginDir}" but failed to enable as "${invokeName}": ${enableError.message}`));
    console.warn(chalk.yellow(`  The plugin files remain at "${targetPluginDir}". You may need to remove them manually or try enabling again with a different invoke name.`));
    throw new Error(`Plugin copied but failed to enable: ${enableError.message}`);
  }
};
