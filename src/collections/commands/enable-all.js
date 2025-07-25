// src/collections/commands/enable-all.js
const { validatorPath } = require('@paths');
const { validate: pluginValidator } = require(validatorPath);

module.exports = async function enableAllPluginsInCollection(dependencies, collectionName, options = {}) {
  const { fss, path, logger } = dependencies;

  const collectionPath = path.join(this.collRoot, collectionName);
  if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
    logger.error('Collection not found', {
      context: 'CollectionEnableAll',
      collectionName: collectionName,
      collectionPath: collectionPath
    });
    return { success: false, messages: [`Collection "${collectionName}" not found.`] };
  }

  const availablePlugins = await this.listAvailablePlugins(collectionName); // Uses bound method
  if (!availablePlugins || availablePlugins.length === 0) {
    logger.warn('No available plugins found in collection', {
      context: 'CollectionEnableAll',
      collectionName: collectionName
    });
    return { success: true, messages: [`No available plugins found in "${collectionName}".`] };
  }

  let defaultPrefixToUse = '';
  if (!options.noPrefix && !(options.prefix && typeof options.prefix === 'string')) {
    const metadata = await this._readCollectionMetadata(collectionName); // Uses private method
    if (metadata && metadata.source) {
      const source = metadata.source;
      const gitHubHttpsMatch = source.match(/^https?:\/\/github\.com\/([^/]+)\/[^/.]+(\.git)?$/);
      const gitHubSshMatch = source.match(/^git@github\.com:([^/]+)\/[^/.]+(\.git)?$/);

      if (gitHubHttpsMatch && gitHubHttpsMatch[1]) {
        defaultPrefixToUse = `${gitHubHttpsMatch[1]}-`;
      } else if (gitHubSshMatch && gitHubSshMatch[1]) {
        defaultPrefixToUse = `${gitHubSshMatch[1]}-`;
      } else if (/^(http(s)?:\/\/|git@)/.test(source)) {
        defaultPrefixToUse = `${collectionName}-`;
        if (!options.isCliCall) {
          logger.warn('Could not extract username from Git URL', {
            context: 'CollectionEnableAll',
            source: source,
            collectionName: collectionName,
            usedPrefix: collectionName
          });
        }
      }
    }
  }

  const results = [];
  let allSucceeded = true;
  let countEnabled = 0;

  for (const plugin of availablePlugins) {
    const collectionPluginId = `${plugin.collection}/${plugin.plugin_id}`;
    let invokeName;

    if (options.noPrefix) {
      invokeName = plugin.plugin_id;
    } else if (options.prefix && typeof options.prefix === 'string') {
      invokeName = `${options.prefix}${plugin.plugin_id}`;
    } else {
      invokeName = `${defaultPrefixToUse}${plugin.plugin_id}`;
    }

    if (!options.bypassValidation) {
      const pluginDirectoryPath = plugin.base_path; // Use base_path for validator
      const validationResult = pluginValidator(pluginDirectoryPath);

      if (!validationResult.isValid) {
        allSucceeded = false;
        const errorMessages = validationResult.errors.join('\n - '); // Changed from '   - ' to '- ' for cleaner message
        results.push({ plugin: collectionPluginId, invoke_name: invokeName, status: 'failed', message: `Validation failed: ${errorMessages}` });
        logger.warn('Failed to enable plugin: Validation failed', {
          context: 'CollectionEnableAll',
          plugin: collectionPluginId,
          invokeName: invokeName
        });
        // Log validator's output as it's typically more detailed
        validationResult.errors.forEach(e => logger.error('Validation error detail', {
          context: 'CollectionEnableAll',
          errorDetail: e
        }));
        validationResult.warnings.forEach(w => logger.warn('Validation warning detail', {
          context: 'CollectionEnableAll',
          warningDetail: w
        }));
        continue; // Continue to the next plugin in the batch
      }
    }

    try {
      // Pass the bypassValidation option down to enablePlugin
      const enableResult = await this.enablePlugin(collectionPluginId, { name: invokeName, bypassValidation: options.bypassValidation });
      results.push({ plugin: collectionPluginId, invoke_name: enableResult.invoke_name, status: 'enabled', message: enableResult.message });
      countEnabled++;
    } catch (error) {
      allSucceeded = false;
      results.push({ plugin: collectionPluginId, invoke_name: invokeName, status: 'failed', message: error.message });
      logger.warn('Failed to enable plugin', {
        context: 'CollectionEnableAll',
        plugin: collectionPluginId,
        invokeName: invokeName,
        error: error.message
      });
    }
  }

  const summaryMessage = `Batch enablement for collection "${collectionName}": ${countEnabled} of ${availablePlugins.length} plugins enabled.`;
  logger.info('Batch enablement complete', {
    context: 'CollectionEnableAll',
    collectionName: collectionName,
    enabledCount: countEnabled,
    totalPlugins: availablePlugins.length,
    summary: summaryMessage
  });
  results.forEach(r => {
    if (r.status === 'enabled') {
      logger.success('Plugin enabled successfully in batch', {
        context: 'CollectionEnableAll',
        invokeName: r.invoke_name,
        originalPluginId: r.plugin,
        status: r.status
      });
    } else {
      logger.warn('Plugin enablement failed in batch', {
        context: 'CollectionEnableAll',
        invokeName: r.invoke_name,
        originalPluginId: r.plugin,
        status: r.status,
        message: r.message
      });
    }
  });

  return { success: allSucceeded, messages: [summaryMessage, ...results.map(r => `${r.invoke_name}: ${r.status} - ${r.message}`)] };
};
