// src/cli/plugin/disable.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const logger = require(loggerPath);

// Handle disabling user plugins by updating their state in the unified manifest
async function disableUserPlugin(pluginName, manager) {
  const userPluginsPath = path.join(manager.collRoot, 'user-plugins');
  const pluginsManifestPath = path.join(userPluginsPath, 'plugins.yaml');

  // Check if user-plugins directory and manifest exist
  if (!fs.existsSync(userPluginsPath) || !fs.existsSync(pluginsManifestPath)) {
    return false; // Not a user plugin
  }

  let pluginStates;
  let parsed;

  // Read existing plugins manifest
  try {
    const content = fs.readFileSync(pluginsManifestPath, 'utf8');
    parsed = yaml.load(content) || {};
    pluginStates = parsed?.plugins || {};
  } catch (e) {
    logger.warn(`Could not read user plugins manifest: ${e.message}`);
    return false;
  }

  // Check if plugin exists in manifest
  if (!pluginStates[pluginName]) {
    return false; // Not a user plugin
  }

  // Check if plugin is already disabled
  if (pluginStates[pluginName].enabled === false) {
    return false; // Already disabled
  }

  // Disable the plugin
  pluginStates[pluginName].enabled = false;

  // Write updated manifest
  const updatedManifest = {
    version: '1.0',
    migrated_on: parsed?.migrated_on,
    plugins: pluginStates,
  };

  fs.writeFileSync(pluginsManifestPath, yaml.dump(updatedManifest));
  logger.debug(`Disabled user plugin '${pluginName}' in unified manifest`);

  return true; // Successfully disabled user plugin
}

module.exports = {
  command: 'disable <invoke_name>',
  describe: 'disables an active plugin',
  builder: (yargsCmd) => {
    yargsCmd.positional('invoke_name', {
      describe: "current 'invoke_name' of plugin to disable",
      type: 'string',
      demandOption: true,
      completionKey: 'enabledPlugins',
    });
  },
  handler: async (args) => {
    if (!args.manager || !args.configResolver) {
      logger.fatal(
        'FATAL ERROR: CollectionsManager or ConfigResolver instance not found in CLI arguments.',
      );
      process.exit(1);
    }
    const manager = args.manager;
    const configResolver = args.configResolver;

    logger.info('oshea plugin: Attempting to disable plugin...');
    logger.detail(`  Plugin Invoke Name: ${args.invoke_name}`);

    try {
      // First check if it's a user plugin
      await configResolver._initializeResolverIfNeeded();
      const pluginRegistryEntry =
        configResolver.mergedPluginRegistry[args.invoke_name];

      if (pluginRegistryEntry?.sourceType?.startsWith('User (')) {
        // Handle user plugin disable using unified architecture
        const disabledUserPlugin = await disableUserPlugin(
          args.invoke_name,
          manager,
        );
        if (disabledUserPlugin) {
          logger.success('Plugin disabled successfully');
        } else {
          logger.warn(
            'Plugin was not found in user plugins manifest or already disabled',
          );
        }
      } else {
        // Handle CM-managed plugin disable
        await manager.disablePlugin(args.invoke_name);
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin disable' command: ${error.message}`);
      process.exit(1);
    }
  },
};
