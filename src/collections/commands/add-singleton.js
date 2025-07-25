// src/collections/commands/add-singleton.js

module.exports = async function addSingletonPlugin(dependencies, sourcePluginPath, options = {}) {
  const { fss, path, cmUtils, fs, fsExtra, constants, logger } = dependencies;

  logger.info('Attempting to add singleton plugin', {
    context: 'AddSingletonPluginCommand',
    sourcePluginPath: sourcePluginPath,
    options: options
  });

  // 1. Validate sourcePluginPath
  if (!fss.existsSync(sourcePluginPath)) {
    logger.error('Source plugin path does not exist', {
      context: 'AddSingletonPluginCommand',
      sourcePluginPath: sourcePluginPath,
      error: `Source plugin path does not exist: "${sourcePluginPath}"`
    });
    throw new Error(`Source plugin path does not exist: "${sourcePluginPath}"`);
  }
  if (!fss.lstatSync(sourcePluginPath).isDirectory()) {
    logger.error('Source plugin path is not a directory', {
      context: 'AddSingletonPluginCommand',
      sourcePluginPath: sourcePluginPath,
      error: `Source plugin path is not a directory: "${sourcePluginPath}"`
    });
    throw new Error(`Source plugin path is not a directory: "${sourcePluginPath}"`);
  }

  const pluginId = path.basename(sourcePluginPath);
  if (!cmUtils.isValidPluginName(pluginId)) {
    logger.error('Source plugin directory name is not a valid plugin name', {
      context: 'AddSingletonPluginCommand',
      pluginId: pluginId,
      sourcePluginPath: sourcePluginPath,
      error: `Source plugin directory name "${pluginId}" is not a valid plugin name (alphanumeric and hyphens, not at start/end).`
    });
    throw new Error(`Source plugin directory name "${pluginId}" is not a valid plugin name (alphanumeric and hyphens, not at start/end).`);
  }

  const potentialConfigs = [`${pluginId}.config.yaml`, `${pluginId}.yaml`];
  const foundConfig = potentialConfigs.find(cfg => fss.existsSync(path.join(sourcePluginPath, cfg)));

  if (!foundConfig) {
    const altConfigs = fss.readdirSync(sourcePluginPath).filter(f => f.endsWith('.config.yaml') || f.endsWith('.yaml'));
    if (altConfigs.length === 0) {
      logger.error('Source directory does not appear to be a valid plugin', {
        context: 'AddSingletonPluginCommand',
        sourcePluginPath: sourcePluginPath,
        error: `Source directory "${sourcePluginPath}" does not appear to be a valid plugin: missing a recognized '*.config.yaml' or '*.yaml' file.`
      });
      throw new Error(`Source directory "${sourcePluginPath}" does not appear to be a valid plugin: missing a recognized '*.config.yaml' or '*.yaml' file.`);
    }
    logger.warn('Plugin config not found by standard name, but other config files exist', {
      context: 'AddSingletonPluginCommand',
      sourcePluginPath: sourcePluginPath,
      foundAlternatives: altConfigs.join(', '),
      suggestion: 'Ensure the primary config file is named correctly.'
    });
  } else {
    logger.debug('Found plugin configuration file', {
      context: 'AddSingletonPluginCommand',
      configFile: path.join(sourcePluginPath, foundConfig)
    });
  }


  // 2. Determine invoke_name
  let invokeName = options.name || pluginId;
  if (!cmUtils.isValidPluginName(invokeName)) {
    logger.error('Invalid invoke_name provided', {
      context: 'AddSingletonPluginCommand',
      invokeName: invokeName,
      error: `Invalid invoke_name: "${invokeName}". Must be alphanumeric and hyphens (not at start/end).`
    });
    throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric and hyphens (not at start/end).`);
  }

  const enabledManifest = await this._readEnabledManifest();
  if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
    logger.error('Invoke name is already in use', {
      context: 'AddSingletonPluginCommand',
      invokeName: invokeName,
      error: `Invoke name "${invokeName}" is already in use. Please choose a different name using --name.`
    });
    throw new Error(`Invoke name "${invokeName}" is already in use. Please choose a different name using --name.`);
  }
  logger.debug('Invoke name is unique', {
    context: 'AddSingletonPluginCommand',
    invokeName: invokeName
  });


  // 3. Target Directory for singletons
  const singletonsBaseDir = path.join(this.collRoot, constants.USER_ADDED_PLUGINS_DIR_NAME);
  const targetPluginDir = path.join(singletonsBaseDir, pluginId);

  if (fss.existsSync(targetPluginDir)) {
    logger.error('A plugin with this ID already exists in user-added plugins directory', {
      context: 'AddSingletonPluginCommand',
      pluginId: pluginId,
      targetDir: targetPluginDir,
      error: `A plugin with ID "${pluginId}" already exists in the user-added plugins directory: "${targetPluginDir}". Remove it first or choose a different source plugin directory name.`
    });
    throw new Error(`A plugin with ID "${pluginId}" already exists in the user-added plugins directory: "${targetPluginDir}". Remove it first or choose a different source plugin directory name.`);
  }
  await fs.mkdir(singletonsBaseDir, { recursive: true });
  await fs.mkdir(targetPluginDir, { recursive: true });
  logger.debug('Target directories for singleton plugin ensured', {
    context: 'AddSingletonPluginCommand',
    baseDir: singletonsBaseDir,
    targetDir: targetPluginDir
  });

  // 4. Copy plugin contents
  try {
    await fsExtra.copy(sourcePluginPath, targetPluginDir);
    logger.info('Plugin files copied successfully', {
      context: 'AddSingletonPluginCommand',
      source: sourcePluginPath,
      target: targetPluginDir
    });
  } catch (copyError) {
    logger.error('Failed to copy plugin files', {
      context: 'AddSingletonPluginCommand',
      source: sourcePluginPath,
      target: targetPluginDir,
      error: copyError.message
    });
    await fsExtra.rm(targetPluginDir, { recursive: true, force: true }).catch((err) => {
      logger.warn('Failed to clean up partially copied plugin directory', {
        context: 'AddSingletonPluginCommand',
        directory: targetPluginDir,
        error: err.message
      });
    });
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
  logger.debug('Singleton plugin metadata written', {
    context: 'AddSingletonPluginCommand',
    collectionName: metadataHoldingCollectionName
  });


  // 6. Automatically enable the plugin
  const collectionPluginIdForEnable = `${constants.USER_ADDED_PLUGINS_DIR_NAME}/${pluginId}`;

  try {
    await this.enablePlugin(collectionPluginIdForEnable, { name: invokeName });
    logger.success('Singleton plugin added and enabled', {
      context: 'AddSingletonPluginCommand',
      pluginId: pluginId,
      source: sourcePluginPath,
      invokeName: invokeName,
      outputPath: targetPluginDir
    });
    return {
      success: true,
      message: `Singleton plugin "${pluginId}" added and enabled as "${invokeName}".`,
      invoke_name: invokeName,
      collectionPluginId: collectionPluginIdForEnable,
      path: targetPluginDir
    };
  } catch (enableError) {
    logger.error('Plugin copied but failed to enable', {
      context: 'AddSingletonPluginCommand',
      pluginId: pluginId,
      targetDir: targetPluginDir,
      invokeName: invokeName,
      error: enableError.message
    });
    logger.warn('Plugin files remain, manual cleanup or re-enable may be needed', {
      context: 'AddSingletonPluginCommand',
      directory: targetPluginDir,
      suggestion: 'You may need to remove them manually or try enabling again with a different invoke name.'
    });
    throw new Error(`Plugin copied but failed to enable: ${enableError.message}`);
  }
};
