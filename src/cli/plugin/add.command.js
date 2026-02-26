// src/cli/plugin/add.command.js
const path = require('node:path');
const { loggerPath, cliPath, colorThemePath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);
const { theme } = require(colorThemePath);

module.exports = {
  command: 'add <source>',
  describe: 'add and enable a plugin from a local path or git URL',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('source', {
        describe: 'path or git URL for a single-plugin source',
        type: 'string',
      })
      .option('name', {
        describe: 'set a custom invoke name for this plugin',
        type: 'string',
      })
      .epilogue(
        'If --name is omitted, the plugin id from <plugin>.config.yaml is used as the invoke name.' +
          '\n' +
          "Tip: Use 'oshea plugin list' to see all currently enabled plugins.",
      );
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.addPlugin !== 'function') {
      logger.fatal(
        'FATAL ERROR: PluginInstaller or addPlugin method not available.',
      );
      return;
    }
    const source = args.source;
    const invokeNameAttempt = args.name || path.basename(source);

    logger.info('oshea plugin: Attempting to add and enable plugin...');
    logger.info(`  Source: ${theme.path(source)}`);
    logger.info(`  Requested Invoke Name: ${theme.value(invokeNameAttempt)}`);

    try {
      const addOptions = {
        name: args.name,
      };
      const result = await args.manager.addPlugin(source, addOptions);

      if (result?.success) {
        logger.success(
          `\nSuccessfully processed 'plugin add' for '${theme.value(result.invoke_name)}'.`,
        );

        logger.info('\nImportant Notes:');
        logger.info(`  • A managed copy of this plugin is now at:`);
        logger.info(`    ${theme.path(result.path)}`);

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
      process.exit(1);
    }
  },
};
