// src/cli/commands/plugin/createCmd.js
const path = require('path');
const { cmUtilsPath, pluginArchetyperPath, collectionsConstantsPath, loggerPath, templateBasicPlugin, cliPath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);
const { isValidPluginName } = require(cmUtilsPath);
const { createArchetype } = require(pluginArchetyperPath);

const fs = require('fs').promises;
const fss = require('fs');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const cmUtils = require(cmUtilsPath);
const constants = require(collectionsConstantsPath);

module.exports = {
  command: 'create <pluginName>',
  describe: 'create a new plugin from template or existing plugin',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'name for the new plugin',
        type: 'string'
      })
      .option('from', {
        describe: 'source to archetype from (registered plugin name, \'collection/id\', or path)',
        type: 'string',
        alias: 'f',
        completionKey: 'usablePlugins'
      })
      .option('target-dir', {
        alias: 't',
        describe: 'directory to create the new plugin in',
        type: 'string',
        normalize: true
      })
      .option('force', {
        describe: 'overwrite target directory if it exists',
        type: 'boolean',
        default: false
      })
      .epilogue('If --from is omitted, a default template is used.\nIf --target-dir is omitted, defaults to the current directory.');
  },
  handler: async (args) => {
    const newPluginName = args.pluginName;

    if (!isValidPluginName(newPluginName)) {
      logger.error(`ERROR: Invalid plugin name: "${newPluginName}".`);
      process.exit(1);
    }

    if (!args.manager || !args.configResolver) {
      logger.error('ERROR: Manager or ConfigResolver not available. This is an internal setup issue.');
      process.exit(1);
    }

    try {
      let sourceIdentifier;

      if (args.from) {
        const configResolver = args.configResolver;
        await configResolver._initializeResolverIfNeeded();
        const pluginRegistryEntry = configResolver.mergedPluginRegistry[args.from];

        if (pluginRegistryEntry && pluginRegistryEntry.configPath) {
          sourceIdentifier = path.dirname(pluginRegistryEntry.configPath);
        } else {
          sourceIdentifier = args.from;
        }
      } else {
        sourceIdentifier = templateBasicPlugin;
      }

      const options = {
        targetDir: args.targetDir,
        force: args.force
      };

      const dependencies = { chalk: null, cmUtils, constants, fs, fss, fsExtra, yaml, matter, path }; // Pass null for chalk
      const managerContext = {
        collRoot: args.manager.collRoot,
        listAvailablePlugins: args.manager.listAvailablePlugins.bind(args.manager)
      };

      const result = await createArchetype(dependencies, managerContext, sourceIdentifier, newPluginName, options);

      if (result && result.success && result.archetypePath) {
        logger.success(`\nPlugin '${newPluginName}' created successfully.`);
        logger.info('Next steps:');
        logger.detail(`  1. Customize the generated files in: ${result.archetypePath}`);
        logger.detail('  2. Register your new plugin in a main config file.');
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }

    } catch (error) {
      logger.error(`\nERROR during 'plugin create ${newPluginName}': ${error.message}`);
      process.exit(1);
    }
  }
};
