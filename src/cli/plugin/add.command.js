// src/cli/plugin/add.command.js
const path = require('node:path');
const fss = require('node:fs');
const { loggerPath, cliPath, colorThemePath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);
const { theme } = require(colorThemePath);

module.exports = {
  command: 'add <path_to_plugin_dir>',
  describe: 'add and enable a local plugin directory',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('path_to_plugin_dir', {
        describe: 'path to local plugin directory',
        type: 'string',
      })
      .option('name', {
        alias: 'n',
        describe: 'set a custom invoke name for this plugin',
        type: 'string',
      })
      .option('bypass-validation', {
        describe: 'skip plugin validation during enablement',
        type: 'boolean',
        default: false,
      })
      .epilogue(
        'If --name is omitted, the plugin directory name will be used as the invoke name.' +
          '\n' +
          "Tip: Use 'oshea plugin list' to see all currently enabled plugins.",
      );
  },
  handler: async (args) => {
    if (
      !args.manager ||
      typeof args.manager.addSingletonPlugin !== 'function'
    ) {
      logger.fatal(
        'FATAL ERROR: CollectionsManager or addSingletonPlugin method not available.',
      );
      return;
    }

    const pluginPathSourceArg = args.path_to_plugin_dir;
    const absolutePluginPath = path.resolve(pluginPathSourceArg);

    if (
      !fss.existsSync(absolutePluginPath) ||
      !fss.lstatSync(absolutePluginPath).isDirectory()
    ) {
      logger.error(
        `ERROR: Source plugin path "${absolutePluginPath}" (from argument "${pluginPathSourceArg}") not found or is not a directory.`,
      );
      process.exit(1);
      return;
    }

    const derivedPluginId = path.basename(absolutePluginPath);
    const invokeNameAttempt = args.name || derivedPluginId;

    logger.info(
      'oshea plugin: Attempting to add and enable plugin from local path...',
    );
    logger.info(`  Source Path: ${theme.path(absolutePluginPath)}`);
    logger.info(`  Requested Invoke Name: ${theme.value(invokeNameAttempt)}`);

    try {
      const addSingletonOptions = {
        name: args.name,
        bypassValidation: args.bypassValidation,
      };
      const result = await args.manager.addSingletonPlugin(
        absolutePluginPath,
        addSingletonOptions,
      );

      if (result?.success) {
        logger.success(
          `\nSuccessfully processed 'plugin add' for '${theme.value(result.invoke_name)}'.`,
        );

        logger.info('\nImportant Notes:');
        logger.info(
          `  • A copy of your plugin from ${theme.path(absolutePluginPath)} is now managed by oshea at:`,
        );
        logger.info(`    ${theme.path(result.path)}`);
        logger.info(
          "  • For future development, it's recommended to edit your original plugin at:",
        );
        logger.info(`    ${theme.path(absolutePluginPath)}`);
        logger.info(
          '  • To sync any changes from your original plugin into the managed version:',
        );
        logger.info(
          `    ${theme.highlight(`oshea plugin add ${absolutePluginPath} --name ${result.invoke_name}`)}`,
        );
        logger.detail(
          '    (Re-run the add command to sync changes from your original source)',
        );

        logger.info('\nNext Steps:');
        logger.info(
          `  • List active plugins: ${theme.highlight('oshea plugin list')}`,
        );
        logger.info(
          `  • Use your new plugin: ${theme.highlight(`oshea convert mydoc.md --plugin ${result.invoke_name}`)}`,
        );
      } else if (result && !result.success) {
        logger.error(
          `Plugin add operation reported as unsuccessful. Message: ${result.message || 'No specific message.'}`,
        );
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin add' command: ${error.message}`);
    }
  },
};
