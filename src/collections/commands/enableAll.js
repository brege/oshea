// src/collections/commands/enableAll.js
const { validatorPath } = require('@paths');
const { validate: pluginValidator } = require(validatorPath);

module.exports = async function enableAllPluginsInCollection(dependencies, collectionName, options = {}) {
  const { fss, path, chalk, constants } = dependencies;

  // 'this' will be the CollectionsManager instance
  const collectionPath = path.join(this.collRoot, collectionName);
  if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
      console.error(chalk.red(`ERROR: Collection "${collectionName}" not found at ${collectionPath}.`));
      return { success: false, messages: [`Collection "${collectionName}" not found.`] };
  }

  const availablePlugins = await this.listAvailablePlugins(collectionName); // Uses bound method
  if (!availablePlugins || availablePlugins.length === 0) {
      console.log(chalk.yellow(`No available plugins found in collection "${collectionName}".`));
      return { success: true, messages: [`No available plugins found in "${collectionName}".`] };
  }

  let defaultPrefixToUse = "";
  if (!options.noPrefix && !(options.prefix && typeof options.prefix === 'string')) {
      const metadata = await this._readCollectionMetadata(collectionName); // Uses private method
      if (metadata && metadata.source) {
          const source = metadata.source;
          const gitHubHttpsMatch = source.match(/^https?:\/\/github\.com\/([^\/]+)\/[^\/.]+(\.git)?$/);
          const gitHubSshMatch = source.match(/^git@github\.com:([^\/]+)\/[^\/.]+(\.git)?$/);

          if (gitHubHttpsMatch && gitHubHttpsMatch[1]) defaultPrefixToUse = `${gitHubHttpsMatch[1]}-`;
          else if (gitHubSshMatch && gitHubSshMatch[1]) defaultPrefixToUse = `${gitHubSshMatch[1]}-`;
          else if (/^(http(s)?:\/\/|git@)/.test(source)) {
              defaultPrefixToUse = `${collectionName}-`;
              if (!options.isCliCall) console.warn(chalk.yellow(`  WARN: Could not extract username from Git URL "${source}". Using collection name "${collectionName}" as prefix.`));
          }
      }
  }

  const results = [];
  let allSucceeded = true;
  let countEnabled = 0;

  for (const plugin of availablePlugins) {
      const collectionPluginId = `${plugin.collection}/${plugin.plugin_id}`;
      let invokeName;

      if (options.noPrefix) invokeName = plugin.plugin_id;
      else if (options.prefix && typeof options.prefix === 'string') invokeName = `${options.prefix}${plugin.plugin_id}`;
      else invokeName = `${defaultPrefixToUse}${plugin.plugin_id}`;

      // Add validation logic here, conditionally based on options.bypassValidation
      if (!options.bypassValidation) {
        const pluginDirectoryPath = plugin.base_path; // Use base_path for validator
        const validationResult = pluginValidator(pluginDirectoryPath);

        if (!validationResult.isValid) {
            allSucceeded = false;
            const errorMessages = validationResult.errors.join('\n  - ');
            results.push({ plugin: collectionPluginId, invoke_name: invokeName, status: 'failed', message: `Validation failed: ${errorMessages}` });
            console.warn(chalk.yellow(`  Failed to enable ${collectionPluginId} as ${invokeName}: Validation failed.`));
            // Log validator's output as it's typically more detailed
            validationResult.errors.forEach(e => console.warn(chalk.red(`    - ${e}`)));
            validationResult.warnings.forEach(w => console.warn(chalk.yellow(`    - ${w}`)));
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
          console.warn(chalk.yellow(`  Failed to enable ${collectionPluginId} as ${invokeName}: ${error.message}`));
      }
  }

  const summaryMessage = `Batch enablement for collection "${collectionName}": ${countEnabled} of ${availablePlugins.length} plugins enabled.`;
  console.log(chalk.blueBright(summaryMessage));
  results.forEach(r => {
      if (r.status === 'enabled') console.log(chalk.green(`  - ${r.invoke_name} (from ${r.plugin}) : ${r.status}`));
      else console.log(chalk.yellow(`  - ${r.invoke_name} (from ${r.plugin}) : ${r.status} - ${r.message}`));
  });

  return { success: allSucceeded, messages: [summaryMessage, ...results.map(r => `${r.invoke_name}: ${r.status} - ${r.message}`)] };
};
