// src/cli/commands/plugin/remove.command.js
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const { loggerPath, cliPath, colorThemePath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);
const { theme } = require(colorThemePath);

// Handle removing user plugins by removing their directory and updating the unified manifest
async function removeUserPlugin(pluginName, manager) {
  const userPluginsPath = path.join(manager.collRoot, 'user-plugins');
  const pluginDir = path.join(userPluginsPath, pluginName);
  const pluginsManifestPath = path.join(userPluginsPath, 'plugins.yaml');

  // Check if user-plugins directory and plugin directory exist
  if (!fs.existsSync(userPluginsPath)) {
    return { success: false, reason: 'no_user_plugins_dir' };
  }

  if (!fs.existsSync(pluginDir)) {
    return { success: false, reason: 'plugin_not_found' };
  }

  // Check if manifest exists and plugin is in it
  if (!fs.existsSync(pluginsManifestPath)) {
    return { success: false, reason: 'no_manifest' };
  }

  let pluginStates = {};
  let parsed = {};

  // Read existing plugins manifest
  try {
    const content = fs.readFileSync(pluginsManifestPath, 'utf8');
    parsed = yaml.load(content);
    pluginStates = parsed?.plugins || {};
  } catch (e) {
    logger.warn(`Could not read user plugins manifest: ${e.message}`);
    return { success: false, reason: 'manifest_read_error', error: e.message };
  }

  // Check if plugin exists in manifest
  if (!pluginStates[pluginName]) {
    return { success: false, reason: 'not_in_manifest' };
  }

  // Get plugin type and source info for reporting
  const pluginInfo = pluginStates[pluginName];
  const pluginType = pluginInfo.type;
  let sourceInfo = '';

  if (pluginType === 'added' && pluginInfo.added_from) {
    sourceInfo = `(originally added from: ${pluginInfo.added_from})`;
  } else if (pluginType === 'created' && pluginInfo.created_from) {
    sourceInfo = `(created from: ${pluginInfo.created_from})`;
  }

  // Remove plugin from manifest
  delete pluginStates[pluginName];

  // Write updated manifest
  const updatedManifest = {
    version: '1.0',
    migrated_on: parsed?.migrated_on,
    plugins: pluginStates
  };

  try {
    fs.writeFileSync(pluginsManifestPath, yaml.dump(updatedManifest));
    logger.debug(`Removed user plugin '${pluginName}' from unified manifest`);
  } catch (e) {
    logger.error(`Failed to update plugins manifest: ${e.message}`);
    return { success: false, reason: 'manifest_write_error', error: e.message };
  }

  // Remove plugin directory
  try {
    await fsExtra.rm(pluginDir, { recursive: true, force: true });
    logger.debug(`Removed plugin directory: ${pluginDir}`);
  } catch (e) {
    logger.error(`Failed to remove plugin directory: ${e.message}`);
    // Try to restore the manifest entry since directory removal failed
    try {
      pluginStates[pluginName] = pluginInfo;
      const restoredManifest = {
        version: '1.0',
        migrated_on: parsed?.migrated_on,
        plugins: pluginStates
      };
      fs.writeFileSync(pluginsManifestPath, yaml.dump(restoredManifest));
      logger.debug('Restored plugin entry in manifest due to directory removal failure');
    } catch (restoreError) {
      logger.error(`Failed to restore manifest entry: ${restoreError.message}`);
    }
    return { success: false, reason: 'directory_removal_error', error: e.message };
  }

  return {
    success: true,
    pluginType: pluginType,
    sourceInfo: sourceInfo,
    removedPath: pluginDir
  };
}

module.exports = {
  command: 'remove <plugin_name>',
  describe: 'remove a user plugin (created or added) from the system',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('plugin_name', {
        describe: 'name of the plugin to remove',
        type: 'string',
        demandOption: true,
        completionKey: 'userPlugins'
      })
      .option('force', {
        describe: 'skip confirmation prompt',
        type: 'boolean',
        default: false
      })
      .epilogue(`
This command removes user plugins (both created and added plugins) from the unified user-plugins structure.
It will:
  • Remove the plugin directory and all its files
  • Remove the plugin entry from the unified manifest
  • Update plugin completion cache

Note: This only affects user plugins in the user-plugins/ directory.
Bundled plugins and collection-managed plugins cannot be removed this way.`);
  },
  handler: async (args) => {
    if (!args.manager) {
      logger.fatal('FATAL ERROR: CollectionsManager instance not found in CLI arguments.');
      process.exit(1);
    }

    const manager = args.manager;
    const pluginName = args.plugin_name;

    logger.info('md-to-pdf plugin: Attempting to remove plugin...');
    logger.detail(`  Plugin Name: ${theme.value(pluginName)}`);

    try {
      // Check if it's a user plugin first
      const result = await removeUserPlugin(pluginName, manager);

      if (!result.success) {
        switch (result.reason) {
        case 'no_user_plugins_dir':
          logger.error(`No user plugins directory found. Plugin '${pluginName}' cannot be removed.`);
          logger.info('User plugins are stored in the user-plugins/ directory within your collections root.');
          break;
        case 'plugin_not_found':
          logger.error(`Plugin '${pluginName}' not found in user plugins directory.`);
          logger.info('Use \'md-to-pdf plugin list\' to see available user plugins.');
          break;
        case 'no_manifest':
          logger.error(`Plugins manifest not found. Cannot remove plugin '${pluginName}'.`);
          break;
        case 'not_in_manifest':
          logger.error(`Plugin '${pluginName}' not found in plugins manifest.`);
          logger.info('This plugin may have been manually added or the manifest may be corrupted.');
          break;
        case 'manifest_read_error':
          logger.error(`Failed to read plugins manifest: ${result.error}`);
          break;
        case 'manifest_write_error':
          logger.error(`Failed to update plugins manifest: ${result.error}`);
          break;
        case 'directory_removal_error':
          logger.error(`Failed to remove plugin directory: ${result.error}`);
          break;
        default:
          logger.error(`Unknown error removing plugin '${pluginName}': ${result.reason}`);
        }
        process.exit(1);
        return;
      }

      // Success case
      logger.success(`\nPlugin '${theme.value(pluginName)}' removed successfully.`);

      if (result.sourceInfo) {
        logger.info(`  Plugin Type: ${theme.value(result.pluginType)} ${result.sourceInfo}`);
      }

      logger.info(`  Removed: ${theme.path(result.removedPath)}`);

      logger.info('\nNext Steps:');
      logger.info(`  • List remaining plugins: ${theme.highlight('md-to-pdf plugin list')}`);

      if (result.pluginType === 'added' && result.sourceInfo) {
        logger.info(`  • To re-add this plugin: ${theme.highlight('md-to-pdf plugin add <original_path>')}`);
      } else if (result.pluginType === 'created') {
        logger.info(`  • To recreate this plugin: ${theme.highlight('md-to-pdf plugin create ' + pluginName + ' --from <source>')}`);
      }

      // Update tab completion cache
      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }

    } catch (error) {
      logger.error(`\nERROR in 'plugin remove' command: ${error.message}`);
      process.exit(1);
    }
  }
};
