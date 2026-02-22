// src/cli/plugin/validate.command.js
const path = require('path');
const fs = require('fs');
const { pluginValidatorPath, loggerPath, projectRoot } = require('@paths');
const { validate: pluginValidator } = require(pluginValidatorPath);

const logger = require(loggerPath);

module.exports = {
  command: 'validate <pluginIdentifier>',
  describe: 'validate a plugin by name or path',
  builder: (yargs) => {
    yargs
      .positional('pluginIdentifier', {
        describe: "name or path of plugin e.g. 'cv'",
        type: 'string',
        demandOption: true,
        completionKey: 'usablePlugins',
      })
      .demandOption(
        'pluginIdentifier',
        'Please provide a plugin name or path to validate.',
      );
  },
  handler: async (argv) => {
    const { pluginIdentifier } = argv;
    let pluginDirectoryPath;

    try {
      const resolvedIdentifier = path.resolve(pluginIdentifier);
      const isPath =
        fs.existsSync(resolvedIdentifier) &&
        fs.statSync(resolvedIdentifier).isDirectory();

      if (isPath) {
        pluginDirectoryPath = resolvedIdentifier;
      } else {
        // First try bundled plugins directory
        pluginDirectoryPath = path.join(
          projectRoot,
          'plugins',
          pluginIdentifier,
        );

        if (
          !fs.existsSync(pluginDirectoryPath) ||
          !fs.statSync(pluginDirectoryPath).isDirectory()
        ) {
          // Not found in bundled plugins, check if it's a user-added plugin via manager
          if (!argv.manager || !argv.configResolver) {
            logger.error(
              `Error: Plugin directory not found for identifier: '${pluginIdentifier}'. Expected path: '${pluginDirectoryPath}'.`,
            );
            process.exit(1);
            return;
          }

          const configResolver = argv.configResolver;
          await configResolver._initializeResolverIfNeeded();
          const pluginRegistryEntry =
            configResolver.mergedPluginRegistry[pluginIdentifier];

          if (pluginRegistryEntry && pluginRegistryEntry.configPath) {
            pluginDirectoryPath = path.dirname(pluginRegistryEntry.configPath);
          } else {
            logger.error(
              `Error: Plugin '${pluginIdentifier}' not found. Checked bundled plugins and user-added plugins.`,
            );
            process.exit(1);
            return;
          }
        }
      }

      const validationResult = pluginValidator(pluginDirectoryPath);

      if (!validationResult.isValid) {
        process.exit(1);
      }
    } catch (error) {
      logger.error(
        `An unexpected error occurred during validation: ${error.message}`,
      );
      if (error.stack) {
        logger.error(error.stack);
      }
      process.exit(1);
    }
  },
};
