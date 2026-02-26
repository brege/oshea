// src/cli/plugin/create.command.js
const path = require('node:path');
const {
  cmUtilsPath,
  pluginArchetyperPath,
  loggerPath,
  templateBasicPlugin,
  cliPath,
  collectionsMetadataFilename,
} = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);
const { isValidPluginName } = require(cmUtilsPath);
const { createArchetype } = require(pluginArchetyperPath);

const fs = require('node:fs').promises;
const fss = require('node:fs');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const cmUtils = require(cmUtilsPath);

module.exports = {
  command: 'create <pluginName>',
  describe: 'create a new plugin from template or existing plugin',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'name for the new plugin',
        type: 'string',
      })
      .option('from', {
        describe: 'source to archetype from (registered plugin name or path)',
        type: 'string',
        alias: 'f',
        completionKey: 'usablePlugins',
      })
      .option('outdir', {
        alias: 'o',
        describe: 'directory to create the new plugin in',
        type: 'string',
        normalize: true,
      })
      .option('force', {
        describe: 'overwrite target directory if it exists',
        type: 'boolean',
        default: false,
      })
      .epilogue(
        "If --from is omitted, a default template is used.\nIf --outdir is omitted, creates a 'my-plugins' directory in your project for development.",
      );
  },
  handler: async (args) => {
    const newPluginName = args.pluginName;

    if (!isValidPluginName(newPluginName)) {
      logger.error(`ERROR: Invalid plugin name: "${newPluginName}".`);
      process.exit(1);
    }

    if (!args.manager || !args.configResolver) {
      logger.error(
        'ERROR: Manager or ConfigResolver not available. This is an internal setup issue.',
      );
      process.exit(1);
    }

    try {
      let sourceIdentifier;

      if (args.from) {
        const configResolver = args.configResolver;
        await configResolver._initializeResolverIfNeeded();
        const pluginRegistryEntry =
          configResolver.mergedPluginRegistry[args.from];

        if (pluginRegistryEntry?.configPath) {
          sourceIdentifier = path.dirname(pluginRegistryEntry.configPath);
        } else {
          sourceIdentifier = args.from;
        }
      } else {
        sourceIdentifier = templateBasicPlugin;
      }

      const options = {
        targetDir: args.outdir, // Will be undefined if not specified, allowing archetyper to use its default
        force: args.force,
      };

      const dependencies = {
        chalk: null,
        cmUtils,
        fs,
        fss,
        fsExtra,
        yaml,
        matter,
        path,
        collectionsMetadataFilename,
        collectionsDefaultArchetypeDirname: 'plugins',
      }; // Pass null for chalk
      const managerContext = {
        collRoot: path.dirname(args.manager.pluginsRoot),
      };

      const result = await createArchetype(
        dependencies,
        managerContext,
        sourceIdentifier,
        newPluginName,
        options,
      );

      if (result?.success && result.archetypePath) {
        logger.success(`\nPlugin '${newPluginName}' created successfully.`);
        logger.info('Next steps:');
        logger.detail(
          `  1. Customize the generated files in: ${result.archetypePath}`,
        );
        logger.detail('  2. Add your plugin to oshea:');
        logger.detail(`     oshea plugin add "${result.archetypePath}"`);
        logger.detail(
          '  3. Test your plugin: oshea convert mydoc.md --plugin ' +
            newPluginName,
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
      logger.error(
        `\nERROR during 'plugin create ${newPluginName}': ${error.message}`,
      );
      process.exit(1);
    }
  },
};
