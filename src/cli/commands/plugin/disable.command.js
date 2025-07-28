// src/cli/commands/plugin/disable.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const logger = require(loggerPath);

// Handle disabling created plugins by tracking them in a disabled manifest
async function disableCreatedPlugin(pluginName, manager) {
  const myPluginsDisabledPath = path.join(path.dirname(manager.collRoot), 'my-plugins', '.disabled.yaml');

  let disabledList = [];

  // Read existing disabled list
  if (fs.existsSync(myPluginsDisabledPath)) {
    try {
      const content = fs.readFileSync(myPluginsDisabledPath, 'utf8');
      const parsed = yaml.load(content);
      disabledList = parsed?.disabled_plugins || [];
    } catch (e) {
      logger.warn(`Could not read disabled plugins manifest: ${e.message}`);
    }
  }

  // Add plugin to disabled list if not already there
  if (!disabledList.includes(pluginName)) {
    disabledList.push(pluginName);

    // Create directory if it doesn't exist
    const myPluginsDir = path.dirname(myPluginsDisabledPath);
    if (!fs.existsSync(myPluginsDir)) {
      fs.mkdirSync(myPluginsDir, { recursive: true });
    }

    // Write updated disabled list
    const disabledManifest = {
      disabled_plugins: disabledList,
      last_updated: new Date().toISOString()
    };

    fs.writeFileSync(myPluginsDisabledPath, yaml.dump(disabledManifest));
    logger.debug(`Added '${pluginName}' to created plugins disabled list`);
  }
}

module.exports = {
  command: 'disable <invoke_name>',
  describe: 'disables an active plugin',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('invoke_name', {
        describe: 'current \'invoke_name\' of plugin to disable',
        type: 'string',
        demandOption: true,
        completionKey: 'enabledPlugins'
      });
  },
  handler: async (args) => {
    if (!args.manager || !args.configResolver) {
      logger.fatal('FATAL ERROR: CollectionsManager or ConfigResolver instance not found in CLI arguments.');
      process.exit(1);
    }
    const manager = args.manager;
    const configResolver = args.configResolver;

    logger.info('md-to-pdf plugin: Attempting to disable plugin...');
    logger.detail(`  Plugin Invoke Name: ${args.invoke_name}`);

    try {
      // First check if it's a created plugin
      await configResolver._initializeResolverIfNeeded();
      const pluginRegistryEntry = configResolver.mergedPluginRegistry[args.invoke_name];

      if (pluginRegistryEntry && pluginRegistryEntry.sourceType === 'Created (my-plugins)') {
        // Handle created plugin disable differently
        await disableCreatedPlugin(args.invoke_name, manager);
        logger.success('Plugin disabled successfully');
      } else {
        // Handle CM-managed plugin disable
        await manager.disablePlugin(args.invoke_name);
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin disable' command: ${error.message}`);
      process.exit(1);
    }
  }
};
