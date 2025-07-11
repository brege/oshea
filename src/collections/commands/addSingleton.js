// src/collections/commands/addSingleton.js

module.exports = async function addSingletonPlugin(dependencies, sourcePluginPath, options = {}) {
  const { fss, path, cmUtils, fs, fsExtra, constants, logger } = dependencies;

  // 1. Validate sourcePluginPath
  if (!fss.existsSync(sourcePluginPath)) {
    throw new Error(`Source plugin path does not exist: "${sourcePluginPath}"`);
  }
  if (!fss.lstatSync(sourcePluginPath).isDirectory()) {
    throw new Error(`Source plugin path is not a directory: "${sourcePluginPath}"`);
  }

  const pluginId = path.basename(sourcePluginPath);
  if (!cmUtils.isValidPluginName(pluginId)) {
    throw new Error(`Source plugin directory name "${pluginId}" is not a valid plugin name (alphanumeric and hyphens, not at start/end).`);
  }

  const potentialConfigs = [`${pluginId}.config.yaml`, `${pluginId}.yaml`];
  const foundConfig = potentialConfigs.find(cfg => fss.existsSync(path.join(sourcePluginPath, cfg)));

  if (!foundConfig) {
    const altConfigs = fss.readdirSync(sourcePluginPath).filter(f => f.endsWith('.config.yaml') || f.endsWith('.yaml'));
    if (altConfigs.length === 0) {
      throw new Error(`Source directory "${sourcePluginPath}" does not appear to be a valid plugin: missing a recognized '*.config.yaml' or '*.yaml' file.`);
    }
  }

  // 2. Determine invoke_name
  let invokeName = options.name || pluginId;
  if (!cmUtils.isValidPluginName(invokeName)) {
    throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric and hyphens (not at start/end).`);
  }

  const enabledManifest = await this._readEnabledManifest();
  if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
    throw new Error(`Invoke name "${invokeName}" is already in use. Please choose a different name using --name.`);
  }

  // 3. Target Directory for singletons
  const singletonsBaseDir = path.join(this.collRoot, constants.USER_ADDED_PLUGINS_DIR_NAME);
  const targetPluginDir = path.join(singletonsBaseDir, pluginId);

  if (fss.existsSync(targetPluginDir)) {
    throw new Error(`A plugin with ID "${pluginId}" already exists in the user-added plugins directory: "${targetPluginDir}". Remove it first or choose a different source plugin directory name.`);
  }
  await fs.mkdir(singletonsBaseDir, { recursive: true });
  await fs.mkdir(targetPluginDir, { recursive: true });

  // 4. Copy plugin contents
  try {
    await fsExtra.copy(sourcePluginPath, targetPluginDir);
  } catch (copyError) {
    await fsExtra.rm(targetPluginDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Failed to copy plugin from "${sourcePluginPath}" to "${targetPluginDir}": ${copyError.message}`);
  }

  const metadataHoldingCollectionName = path.join(constants.USER_ADDED_PLUGINS_DIR_NAME, pluginId);
  const metadataContent = {
    name: pluginId,
    source: path.resolve(sourcePluginPath),
    type: 'singleton',
    added_on: new Date().toISOString(),
  };
  await this._writeCollectionMetadata(metadataHoldingCollectionName, metadataContent);


  // 6. Automatically enable the plugin
  const collectionPluginIdForEnable = `${constants.USER_ADDED_PLUGINS_DIR_NAME}/${pluginId}`;

  try {
    await this.enablePlugin(collectionPluginIdForEnable, { name: invokeName });
    logger.success(`Singleton plugin "${pluginId}" from "${sourcePluginPath}" added and enabled as "${invokeName}".`, { module: 'src/collections/commands/addSingleton.js' });
    return {
      success: true,
      message: `Singleton plugin "${pluginId}" added and enabled as "${invokeName}".`,
      invoke_name: invokeName,
      collectionPluginId: collectionPluginIdForEnable,
      path: targetPluginDir
    };
  } catch (enableError) {
    logger.error(`Plugin "${pluginId}" was copied to "${targetPluginDir}" but failed to enable as "${invokeName}": ${enableError.message}`, { module: 'src/collections/commands/addSingleton.js' });
    logger.warn(`The plugin files remain at "${targetPluginDir}". You may need to remove them manually or try enabling again with a different invoke name.`, { module: 'src/collections/commands/addSingleton.js' });
    throw new Error(`Plugin copied but failed to enable: ${enableError.message}`);
  }
};
